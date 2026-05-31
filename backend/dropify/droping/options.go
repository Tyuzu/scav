package droping

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// OptionsHandler handles CORS preflight requests
func OptionsHandler(
	w http.ResponseWriter,
	r *http.Request,
	_ httprouter.Params,
) {
	w.Header().Set(
		"Access-Control-Allow-Origin",
		"*",
	)

	w.Header().Set(
		"Access-Control-Allow-Methods",
		"GET, POST, PUT, DELETE, OPTIONS",
	)

	w.Header().Set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization",
	)

	w.WriteHeader(http.StatusNoContent)
}
