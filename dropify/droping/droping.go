package droping

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"dropify/filemgr"
	"dropify/infra"
	"dropify/services"
	"dropify/utils"

	"github.com/julienschmidt/httprouter"
)

const maxUploadBytes = 200 << 20 // 200 MB

// Attachment represents a file attachment in responses
type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
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
		utils.RespondWithError(
			w,
			http.StatusBadRequest,
			"failed to parse multipart form: "+err.Error(),
		)
		return
	}

	// -------------------------
	// Frontend fields
	// -------------------------

	entityType := strings.ToLower(strings.TrimSpace(r.FormValue("entityType")))
	entityId := strings.TrimSpace(r.FormValue("entityId"))

	remoteURL := strings.TrimSpace(r.FormValue("remoteUrl"))
	remoteKey := strings.TrimSpace(r.FormValue("remoteKey"))

	_ = entityId // reserved for future use

	// -------------------------
	// Validate entity type
	// -------------------------

	validEntities := map[string]filemgr.EntityType{
		"artist":  filemgr.EntityArtist,
		"user":    filemgr.EntityUser,
		"baito":   filemgr.EntityBaito,
		"worker":  filemgr.EntityWorker,
		"song":    filemgr.EntitySong,
		"post":    filemgr.EntityPost,
		"chat":    filemgr.EntityChat,
		"event":   filemgr.EntityEvent,
		"farm":    filemgr.EntityFarm,
		"crop":    filemgr.EntityCrop,
		"place":   filemgr.EntityPlace,
		"media":   filemgr.EntityMedia,
		"feed":    filemgr.EntityFeed,
		"recipe":  filemgr.EntityRecipe,
		"product": filemgr.EntityProduct,
		"live":    filemgr.EntityLive,
	}

	if _, ok := validEntities[entityType]; !ok {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid entityType")
		return
	}

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

	if remoteURL != "" {

		switch remoteKey {
		case "banner", "photo", "avatar", "seating":
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

		// -------------------------
		// Multipart upload
		// -------------------------

		attachments, err = fileService.ProcessUploadedFiles(
			r,
			entityType,
			entityId,
		)
	}

	// -------------------------
	// Handle errors
	// -------------------------

	if err != nil {

		log.Printf("[Filedrop] Error processing files: %v", err)

		utils.RespondWithError(
			w,
			http.StatusInternalServerError,
			"failed to process files: "+err.Error(),
		)

		return
	}

	// -------------------------
	// Response
	// -------------------------

	response := convertToAttachments(attachments)

	utils.RawJSON(w, http.StatusOK, response)
}

// validateUploadRequest validates the incoming upload request
func validateUploadRequest(w http.ResponseWriter, r *http.Request) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)

	if r.Method != http.MethodPost {
		return fmt.Errorf("method must be POST")
	}

	contentType := r.Header.Get("Content-Type")

	remoteURL := strings.TrimSpace(r.FormValue("remoteUrl"))

	if remoteURL == "" && !strings.HasPrefix(contentType, "multipart/") {
		return fmt.Errorf("content-type must be multipart")
	}

	return nil
}

// convertToAttachments converts service attachments to response format
func convertToAttachments(serviceAttachments []services.Attachment) []Attachment {

	attachments := make([]Attachment, len(serviceAttachments))

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

// OptionsHandler handles preflight OPTIONS requests
func OptionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	w.WriteHeader(http.StatusNoContent)
}
