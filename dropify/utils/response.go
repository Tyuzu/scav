package utils

import (
	"encoding/json"
	"log"
	"net/http"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// SuccessResponse represents a standardized success response wrapper
type SuccessResponse struct {
	Status  int         `json:"status"`
	Data    interface{} `json:"data"`
	Message string      `json:"message,omitempty"`
}

// RespondWithError sends a standardized error response
func RespondWithError(w http.ResponseWriter, status int, message string) {
	RespondWithErrorDetail(w, status, message, "")
}

// RespondWithErrorDetail sends an error response with additional error details
func RespondWithErrorDetail(w http.ResponseWriter, status int, message, errorDetail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := ErrorResponse{
		Status:  status,
		Message: message,
		Error:   errorDetail,
	}

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode error response: %v", err)
	}
}

// RespondWithJSON sends a successful JSON response
func RespondWithJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := SuccessResponse{
		Status: status,
		Data:   data,
	}

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}

// RespondWithJSONMessage sends a successful JSON response with a message
func RespondWithJSONMessage(w http.ResponseWriter, status int, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := SuccessResponse{
		Status:  status,
		Data:    data,
		Message: message,
	}

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}

// RawJSON sends raw JSON without wrapping in standard response format
func RawJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Failed to encode raw JSON response: %v", err)
	}
}
