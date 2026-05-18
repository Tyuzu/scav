package droping

import (
	"fmt"
	"log"
	"net/http"
	"strings"

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
	// Validate request
	if err := validateUploadRequest(r); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
		return
	}

	// Process files
	fileService := services.NewFileService()
	postType := strings.ToLower(strings.TrimSpace(r.FormValue("postType")))

	attachments, err := fileService.ProcessUploadedFiles(r, postType)
	if err != nil {
		log.Printf("[Filedrop] Error processing files: %v", err)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed to process files: "+err.Error())
		return
	}

	// Convert to response format
	response := convertToAttachments(attachments)
	utils.RawJSON(w, http.StatusOK, response)
}

// validateUploadRequest validates the incoming upload request
func validateUploadRequest(r *http.Request) error {
	r.Body = http.MaxBytesReader(nil, r.Body, maxUploadBytes)

	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "multipart/") {
		return fmt.Errorf("content-type must be multipart")
	}

	if r.Method != http.MethodPost {
		return fmt.Errorf("method must be POST")
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
