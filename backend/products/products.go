package products

import (
	"encoding/json"
	"naevis/infra"
	"naevis/models"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func GetProductDetails(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		entityType := ps.ByName("entityType")
		entityId := ps.ByName("entityId")

		var product models.Product

		switch entityType {
			case "product", "tool":
				product = getProductEntity(ctx, entityId, app)
		// case "tool":
		// 	product = getToolEntity(entityId)
		// case "subscription":
		// 	product = getSubscriptionEntity(entityId)
		// case "media":
		// 	product = getMediaEntity(entityId)
		// case "fmcg":
		// 	product = getFMCGEntity(entityId)
		// case "art":
		// 	product = getArtEntity(entityId)
		default:
			http.Error(w, "Invalid entity type", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(product)
	}
}
