package feed

import (
	"naevis/dels"
	"naevis/infra"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// deletePost handles deleting a post by ID
func DeletePost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dels.DeletePost(app)
	}
}
