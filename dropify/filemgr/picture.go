package filemgr

import (
	"context"
	"dropify/config"
	"dropify/globals"
	"dropify/infra"
	"dropify/infra/db"
	"dropify/utils"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// --- sentinel errors ---
var (
	ErrUnsupportedEntity = errors.New("unsupported entity type")
	ErrNotFound          = errors.New("not found")
	ErrUnauthorized      = errors.New("unauthorized")
)

// --- Entity metadata ---
type entityMeta struct {
	collectionName string
	keyField       string
	cachePrefix    string
	ownerField     string
}

var entityMetaMap = map[string]entityMeta{
	"place": {
		collectionName: config.Collections.PlacesCollection,
		keyField:       "placeid",
		cachePrefix:    "place:",
		ownerField:     "createdBy",
	},
	"event": {
		collectionName: config.Collections.EventsCollection,
		keyField:       "eventid",
		cachePrefix:    "event:",
		ownerField:     "creatorid",
	},
	"baito": {
		collectionName: config.Collections.BaitoCollection,
		keyField:       "baitoid",
		cachePrefix:    "baito:",
		ownerField:     "ownerId",
	},
	"worker": {
		collectionName: config.Collections.BaitoWorkerCollection,
		keyField:       "baitoUserId",
		cachePrefix:    "worker:",
		ownerField:     "userId",
	},
	"artist": {
		collectionName: config.Collections.ArtistsCollection,
		keyField:       "artistid",
		cachePrefix:    "artist:",
		ownerField:     "creatorid",
	},
	"farm": {
		collectionName: config.Collections.FarmsCollection,
		keyField:       "farmid",
		cachePrefix:    "farm:",
		ownerField:     "createdBy",
	},
	"crop": {
		collectionName: config.Collections.CropsCollection,
		keyField:       "cropid",
		cachePrefix:    "crop:",
		ownerField:     "createdby",
	},
	"feedpost": {
		collectionName: config.Collections.FeedPostsCollection,
		keyField:       "postid",
		cachePrefix:    "feedpost:",
		ownerField:     "userid",
	},
	"user": {
		collectionName: config.Collections.UserCollection,
		keyField:       "userid",
		cachePrefix:    "user:",
		ownerField:     "userid",
	},
	"recipe": {
		collectionName: config.Collections.RecipeCollection,
		keyField:       "recipeid",
		cachePrefix:    "recipe:",
		ownerField:     "userId",
	},
}

func getEntityMeta(entityType string) (entityMeta, bool) {
	em, ok := entityMetaMap[strings.ToLower(entityType)]
	return em, ok
}

// --- Mongo collection helper ---
func getCollection(database db.Database, name string) db.Database {
	_ = name
	// Return the database interface - operations will be performed through it
	return database
}

// --- Picture fields map ---
var pictureFieldMap = map[string]PictureType{
	"banner":  PicBanner,
	"photo":   PicPhoto,
	"avatar":  PicPhoto,
	"seating": PicSeating,
}

// --- Authorization ---
func authorizeUserForEntity(
	ctx context.Context,
	database db.Database,
	entityType,
	entityID,
	userID string,
) error {

	meta, ok := getEntityMeta(entityType)
	if !ok {
		return ErrUnsupportedEntity
	}

	var result bson.M

	projection := []string{meta.ownerField}

	err := database.FindOneWithProjection(
		ctx,
		meta.collectionName,
		bson.M{meta.keyField: entityID},
		projection,
		&result,
	)

	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ErrNotFound
		}

		return fmt.Errorf("database error: %w", err)
	}

	owner, _ := result[meta.ownerField].(string)

	if owner != userID {
		return ErrUnauthorized
	}

	return nil
}

// --- Update with cache invalidation ---
func updateEntityBannerInDB(
	ctx context.Context,
	database db.Database,
	w *http.ResponseWriter,
	entityType,
	entityID string,
	updateFields bson.M,
) error {

	meta, ok := getEntityMeta(entityType)
	if !ok {
		if w != nil {
			http.Error(*w, "Unsupported entity type", http.StatusBadRequest)
		}
		return ErrUnsupportedEntity
	}

	err := database.UpdateOne(
		ctx,
		meta.collectionName,
		bson.M{meta.keyField: entityID},
		bson.M{
			"$set": updateFields,
		},
	)

	if err != nil {
		if w != nil {
			http.Error(
				*w,
				fmt.Sprintf("Error updating %s", entityType),
				http.StatusInternalServerError,
			)
		}

		return err
	}

	// if _, err := rdx.RdxDel(meta.cachePrefix + entityID); err != nil {
	// 	log.Printf(
	// 		"Cache deletion failed for %s ID: %s. Error: %v",
	// 		entityType,
	// 		entityID,
	// 		err,
	// 	)
	// } else {
	// 	log.Printf(
	// 		"Cache invalidated for %s ID: %s",
	// 		entityType,
	// 		entityID,
	// 	)
	// }

	return nil
}

// --- small helper to handle auth errors consistently in handler ---
func handleAuthError(
	w http.ResponseWriter,
	err error,
	entityType string,
) {

	switch {

	case errors.Is(err, ErrNotFound):
		http.Error(
			w,
			fmt.Sprintf("%s not found", entityType),
			http.StatusNotFound,
		)

	case errors.Is(err, ErrUnauthorized):
		http.Error(
			w,
			"You are not authorized to edit this "+entityType,
			http.StatusForbidden,
		)

	default:
		http.Error(
			w,
			"Internal error",
			http.StatusInternalServerError,
		)
	}
}

// --- File upload wrapper ---
func handleFileUpload(
	form *multipart.Form,
	field string,
	entity EntityType,
	picType PictureType,
) (string, error) {

	return SaveFormFile(
		form,
		field,
		entity,
		picType,
		true,
	)
}

func EditBanner(
	app *infra.Deps,
	w http.ResponseWriter,
	r *http.Request,
	ps httprouter.Params,
) {

	defer r.Body.Close()

	entityTypeStr := ps.ByName("entitytype")
	entityID := ps.ByName("entityid")

	// --- Entity Validation ---
	meta, ok := getEntityMeta(entityTypeStr)

	if !ok || meta.collectionName == "" {
		http.Error(
			w,
			"Unsupported entity type",
			http.StatusBadRequest,
		)
		return
	}

	// --- User Validation ---
	requestingUserID, _ := r.Context().
		Value(globals.UserIDKey).(string)

	if requestingUserID == "" {
		http.Error(
			w,
			"Invalid user",
			http.StatusUnauthorized,
		)
		return
	}

	// --- Authorization ---
	if err := authorizeUserForEntity(
		r.Context(),
		app.DB,
		entityTypeStr,
		entityID,
		requestingUserID,
	); err != nil {

		handleAuthError(w, err, entityTypeStr)
		return
	}

	// --- Extract Banner ---
	field, fileName, err := extractBannerData(
		r,
		entityTypeStr,
	)

	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	// --- DB Update ---
	updateFields := bson.M{
		field:        fileName,
		"updated_at": time.Now(),
	}

	if err := updateEntityBannerInDB(
		r.Context(),
		app.DB,
		&w,
		entityTypeStr,
		entityID,
		updateFields,
	); err != nil {

		log.Printf(
			"DB update failed for %s:%s: %v",
			entityTypeStr,
			entityID,
			err,
		)

		http.Error(
			w,
			"Failed to update banner",
			http.StatusInternalServerError,
		)

		return
	}

	utils.RespondWithJSON(
		w,
		http.StatusOK,
		bson.M{
			"success": true,
			"data":    updateFields,
		},
	)
}

func extractBannerData(
	r *http.Request,
	entityTypeStr string,
) (string, string, error) {

	ct := strings.ToLower(
		r.Header.Get("Content-Type"),
	)

	if strings.Contains(ct, "application/json") ||
		strings.Contains(ct, "text/plain") {

		return parseBannerFromJSON(r)
	}

	if strings.Contains(ct, "multipart/form-data") {
		return parseBannerFromMultipart(
			r,
			entityTypeStr,
		)
	}

	return "", "", fmt.Errorf(
		"unsupported content type",
	)
}

func parseBannerFromJSON(
	r *http.Request,
) (string, string, error) {

	var payload map[string]string

	if err := json.NewDecoder(r.Body).
		Decode(&payload); err != nil {

		return "", "", fmt.Errorf(
			"invalid JSON body",
		)
	}

	var foundField string
	var fileURL string

	for field := range pictureFieldMap {

		if urlStr, ok := payload[field]; ok &&
			urlStr != "" {

			parsed, err := url.ParseRequestURI(
				urlStr,
			)

			if err != nil ||
				(parsed.Scheme != "http" &&
					parsed.Scheme != "https") {

				return "", "", fmt.Errorf(
					"invalid URL for %s",
					field,
				)
			}

			if foundField != "" {
				return "", "", fmt.Errorf(
					"multiple banner URLs provided",
				)
			}

			foundField = field
			fileURL = urlStr
		}
	}

	if foundField == "" {
		return "", "", fmt.Errorf(
			"no valid banner URL provided",
		)
	}

	return foundField, fileURL, nil
}

func parseBannerFromMultipart(
	r *http.Request,
	entityTypeStr string,
) (string, string, error) {

	if err := r.ParseMultipartForm(
		10 << 20,
	); err != nil {

		return "", "", fmt.Errorf(
			"unable to parse form data",
		)
	}

	defer r.MultipartForm.RemoveAll()

	var field string
	var picType PictureType

	for k, v := range pictureFieldMap {

		if _, found := r.MultipartForm.File[k]; found {
			field = k
			picType = v
			break
		}
	}

	if field == "" {
		return "", "", fmt.Errorf(
			"no banner or photo file uploaded",
		)
	}

	fileName, err := handleFileUpload(
		r.MultipartForm,
		field,
		EntityType(entityTypeStr),
		picType,
	)

	if err != nil {

		log.Printf(
			"upload error for %s: %v",
			field,
			err,
		)

		return "", "", fmt.Errorf(
			"failed to upload %s",
			field,
		)
	}

	if fileName == "" {
		return "", "", fmt.Errorf(
			"no %s file uploaded",
			field,
		)
	}

	return field, fileName, nil
}

func UpdateEntityPicsInDB(
	ctx context.Context,
	database db.Database,
	w *http.ResponseWriter,
	entityType,
	entityID string,
	updateFields bson.M,
) error {

	return updateEntityBannerInDB(
		ctx,
		database,
		w,
		entityType,
		entityID,
		updateFields,
	)
}
