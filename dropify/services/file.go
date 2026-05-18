package services

import (
	"fmt"
	"mime/multipart"
	"net/http"

	"dropify/filedrop"
	"dropify/filemgr"
)

// FileService provides file operation abstractions
type FileService struct{}

// NewFileService creates a new FileService instance
func NewFileService() *FileService {
	return &FileService{}
}

// Attachment represents a processed file attachment
type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}

// ProcessUploadedFiles processes all files from a multipart form
func (fs *FileService) ProcessUploadedFiles(r *http.Request, postType string) ([]Attachment, error) {
	if r.MultipartForm == nil || len(r.MultipartForm.File) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	var attachments []Attachment
	normalizedPostType := normalizePostType(postType)

	for fieldKey, files := range r.MultipartForm.File {
		keyLower := normalizeFieldKey(fieldKey)

		for _, fileHeader := range files {
			atts, err := fs.processSingleFile(r, fileHeader, keyLower, normalizedPostType)
			if err != nil {
				return nil, fmt.Errorf("failed to process file %s: %w", fileHeader.Filename, err)
			}
			attachments = append(attachments, atts...)
		}
	}

	return attachments, nil
}

// processSingleFile handles a single file based on its type
func (fs *FileService) processSingleFile(r *http.Request, fileHeader *multipart.FileHeader, fieldKey, postType string) ([]Attachment, error) {
	// Special handling for feed uploads
	if fieldKey == "feed" {
		return fs.processFeedFile(r, fileHeader, fieldKey, postType)
	}

	// Regular upload for all other fields
	return fs.processRegularFile(fileHeader, fieldKey, postType)
}

// processFeedFile handles feed-specific uploads (videos, audio, posters)
func (fs *FileService) processFeedFile(r *http.Request, fileHeader *multipart.FileHeader, fieldKey, postType string) ([]Attachment, error) {
	// Default to video if not specified
	if postType == "" {
		postType = "video"
	}

	picType := postTypeToImageType(postType)

	// For videos/audio, use feed media upload handler
	if postType == "video" || postType == "audio" {
		if _, err := fileHeader.Open(); err != nil {
			return nil, fmt.Errorf("failed to open file: %w", err)
		}
		savedPath, uniqueID, ext, err := filedrop.SaveUploadedFile(fileHeader, filemgr.EntityFeed, picType)
		if err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}

		uploadDir := filemgr.ResolvePath(filemgr.EntityFeed, picType)

		// Process media (video or audio)
		if postType == "video" {
			resolutions, _, err := filedrop.ProcessVideo(r, savedPath, uploadDir, uniqueID, filemgr.EntityFeed)
			if err != nil {
				return nil, fmt.Errorf("video processing failed: %w", err)
			}

			return []Attachment{{
				Filename:    uniqueID,
				Extension:   ext,
				Key:         fieldKey,
				Resolutions: resolutions,
			}}, nil
		}

		// For audio, process similarly
		resolutions, _ := filedrop.ProcessAudio(savedPath, uploadDir, uniqueID, filemgr.EntityFeed)

		return []Attachment{{
			Filename:    uniqueID,
			Extension:   ext,
			Key:         fieldKey,
			Resolutions: resolutions,
		}}, nil
	}

	// For posters and other types, use regular upload
	return fs.processRegularFile(fileHeader, fieldKey, postType)
}

// processRegularFile handles regular file uploads (images, documents)
func (fs *FileService) processRegularFile(fileHeader *multipart.FileHeader, fieldKey, postType string) ([]Attachment, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	picType := postTypeToImageType(postType)
	entityType := filemgr.EntityType(fieldKey)

	// Use filemgr to save the file
	savedName, ext, err := filemgr.SaveFileForEntity(file, fileHeader, entityType, picType)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	return []Attachment{{
		Filename:  savedName,
		Extension: ext,
		Key:       fieldKey,
	}}, nil
}

// Helper functions

func normalizePostType(postType string) string {
	if postType == "" {
		return "photo"
	}
	return postType
}

func normalizeFieldKey(fieldKey string) string {
	return fieldKey // already lowercase in caller
}

func postTypeToImageType(postType string) filemgr.PictureType {
	switch postType {
	case "audio":
		return filemgr.PicAudio
	case "video":
		return filemgr.PicVideo
	case "poster":
		return filemgr.PicPoster
	case "photo":
		return filemgr.PicPhoto
	case "banner":
		return filemgr.PicBanner
	case "document":
		return filemgr.PicDocument
	default:
		return filemgr.PicPhoto
	}
}
