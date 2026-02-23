package routes

import (
	"fmt"
	"naevis/infra"
	"naevis/ratelim"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func SetupRouter(app *infra.Deps, rateLimiter *ratelim.RateLimiter) *httprouter.Router {
	router := httprouter.New()

	router.GET("/health", Index)

	RoutesWrapper(router, app, rateLimiter)

	return router
}

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	fmt.Fprint(w, "200")
}
