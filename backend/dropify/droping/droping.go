package droping

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/dropify/filemgr"
	"naevis/dropify/services"
	"naevis/infra"
	"naevis/utils"
)

const maxUploadBytes = 200 << 20 // 200 MB

// Attachment represents a file attachment in responses
type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

// valid entity types
var validEntities = map[string]filemgr.EntityType{
	"artist":       filemgr.EntityArtist,
	"user":         filemgr.EntityUser,
	"baito":        filemgr.EntityBaito,
	"baito_worker": filemgr.EntityWorker,
	"song":         filemgr.EntitySong,
	"post":         filemgr.EntityPost,
	"chat":         filemgr.EntityChat,
	"event":        filemgr.EntityEvent,
	"farm":         filemgr.EntityFarm,
	"crop":         filemgr.EntityCrop,
	"place":        filemgr.EntityPlace,
	"media":        filemgr.EntityMedia,
	"feedpost":     filemgr.EntityFeed,
	"recipe":       filemgr.EntityRecipe,
	"product":      filemgr.EntityProduct,
	"tool":         filemgr.EntityProduct,
	"live":         filemgr.EntityLive,
}

type EntityMeta struct {
	Collection string
	IDField    string
}

var entityMeta = map[string]EntityMeta{
	"user": {
		Collection: "users",
		IDField:    "userid",
	},
	"artist": {
		Collection: "artists",
		IDField:    "artistid",
	},
	"event": {
		Collection: "events",
		IDField:    "eventid",
	},
	"place": {
		Collection: "places",
		IDField:    "placeid",
	},
	"farm": {
		Collection: "farms",
		IDField:    "farmid",
	},
	"crop": {
		Collection: "crops",
		IDField:    "cropid",
	},
	"recipe": {
		Collection: "recipes",
		IDField:    "recipeid",
	},
	"product": {
		Collection: "products",
		IDField:    "productid",
	},
	"baito": {
		Collection: "baitos",
		IDField:    "baitoid",
	},
	"baito_worker": {
		Collection: "baito_workers",
		IDField:    "baito_worker_id",
	},
	"post": {
		Collection: "posts",
		IDField:    "postid",
	},
	"feedpost": {
		Collection: "feedposts",
		IDField:    "feedpostid",
	},
	"song": {
		Collection: "songs",
		IDField:    "songid",
	},
	"chat": {
		Collection: "chats",
		IDField:    "chatid",
	},
	"live": {
		Collection: "lives",
		IDField:    "liveid",
	},
	"media": {
		Collection: "media",
		IDField:    "mediaid",
	},
}

// FiledropHandler handles file uploads via multipart/form-data
func FiledropHandler(app *infra.Deps, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// -------------------------
	// Validate request
	// -------------------------

	if err := validateUploadRequest(w, r); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// -------------------------
	// Parse multipart form
	// -------------------------

	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
		return
	}

	// cleanup temp files
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	// -------------------------
	// Frontend fields
	// -------------------------

	entityType := strings.ToLower(
		strings.TrimSpace(r.FormValue("entityType")),
	)

	entityId := strings.TrimSpace(
		r.FormValue("entityId"),
	)

	remoteURL := strings.TrimSpace(
		r.FormValue("remoteUrl"),
	)

	remoteKey := strings.TrimSpace(
		r.FormValue("remoteKey"),
	)

	// -------------------------
	// Validate entity type
	// -------------------------

	if entityType == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "entityType is required")
		return
	}

	if _, ok := validEntities[entityType]; !ok {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid entityType")
		return
	}

	log.Printf("[Filedrop] entityType=%s entityId=%s", entityType, entityId)

	// -------------------------
	// Service
	// -------------------------

	fileService := services.NewFileService()

	var (
		attachments []services.Attachment
		err         error
	)

	// -------------------------
	// Remote URL upload
	// -------------------------

	// Remote URL upload
	if remoteURL != "" {
		switch remoteKey {
		case "banner", "photo", "avatar", "seating", "gallery":
		default:
			utils.RespondWithError(w, http.StatusBadRequest, "invalid remoteKey")
			return
		}

		attachments, err = fileService.ProcessRemoteFile(
			remoteURL,
			remoteKey,
			entityType,
			entityId,
		)
	} else {
		// Multipart upload
		if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "no files uploaded")
			return
		}

		attachments, err = fileService.ProcessUploadedFiles(r, entityType, entityId)
	}

	// -------------------------
	// Handle processing errors
	// -------------------------

	if err != nil {
		log.Printf(
			"[Filedrop] processing error: %v",
			err,
		)

		utils.RespondWithError(w, http.StatusInternalServerError, "failed to process files: "+err.Error())
		return
	}

	// -------------------------
	// Update entity document
	// -------------------------

	if entityId != "" {
		if err := updateEntityMedia(app, entityType, entityId, attachments); err != nil {
			log.Printf(
				"[Filedrop] failed updating entity media: %v",
				err,
			)

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"failed to update entity media: "+err.Error(),
			)
			return
		}
	}

	// -------------------------
	// Publish media events
	// -------------------------

	// -------------------------
	// Response
	// -------------------------

	response := convertToAttachments(attachments)
	utils.RespondWithJSON(w, http.StatusOK, response)
}

// validateUploadRequest validates upload request basics
func validateUploadRequest(w http.ResponseWriter, r *http.Request) error {
	// limit body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)

	// only POST allowed
	if r.Method != http.MethodPost {
		return fmt.Errorf("method must be POST")
	}

	contentType := r.Header.Get("Content-Type")

	// remote uploads may not use multipart
	remoteURL := strings.TrimSpace(
		r.FormValue("remoteUrl"),
	)

	if remoteURL == "" &&
		!strings.HasPrefix(contentType, "multipart/") {
		return fmt.Errorf(
			"content-type must be multipart/form-data",
		)
	}

	return nil
}

// convertToAttachments converts service attachments to response format
func convertToAttachments(
	serviceAttachments []services.Attachment,
) []Attachment {
	attachments := make(
		[]Attachment,
		len(serviceAttachments),
	)

	for i, sa := range serviceAttachments {
		attachments[i] = Attachment{
			Filename:    sa.Filename,
			Extension:   sa.Extension,
			Key:         sa.Key,
			Resolutions: sa.Resolutions,
		}
	}

	return attachments
}

// updateEntityMedia updates the mongo document for the entity
func updateEntityMedia(app *infra.Deps, entityType string, entityId string, attachments []services.Attachment) error {
	meta, ok := entityMeta[entityType]
	if !ok {
		return fmt.Errorf("unsupported entity type: %s", entityType)
	}

	filter := bson.M{
		meta.IDField: entityId,
	}

	setFields := bson.M{}
	var photos []string
	var gallery []string

	for _, attachment := range attachments {
		switch strings.ToLower(strings.TrimSpace(attachment.Key)) {
		case "banner":
			setFields["banner"] = attachment.Filename

		case "avatar":
			setFields["avatar"] = attachment.Filename

		case "poster":
			setFields["poster"] = attachment.Filename

		case "thumb":
			setFields["thumb"] = attachment.Filename

		case "seating":
			setFields["seating"] = attachment.Filename

		case "photo":
			photos = append(photos, attachment.Filename)

		case "gallery":
			gallery = append(gallery, attachment.Filename)
		}
	}

	update := bson.M{}

	if len(setFields) > 0 {
		update["$set"] = setFields
	}

	if len(photos) > 0 {
		update["$push"] = bson.M{
			"photos": bson.M{
				"$each": photos,
			},
		}
	}

	if len(gallery) > 0 {
		update["$set"] = mergeSet(update["$set"], bson.M{
			"gallery": gallery,
		})
	}

	if len(update) == 0 {
		return nil
	}

	return app.DB.UpdateOne(
		context.Background(),
		meta.Collection,
		filter,
		update,
	)
}

func mergeSet(existing any, next bson.M) bson.M {
	out := bson.M{}

	if existing != nil {
		if m, ok := existing.(bson.M); ok {
			for k, v := range m {
				out[k] = v
			}
		}
	}

	for k, v := range next {
		out[k] = v
	}

	return out
}
