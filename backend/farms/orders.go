package farms

import (
	"context"
	"encoding/json"
	"log"
	"naevis/infra"
	"naevis/models"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* Incoming orders                                      */
/* ---------------------------------------------------- */

func GetIncomingOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var orders []models.FarmOrder
		if err := app.DB.FindMany(ctx, farmOrdersCollection, bson.M{}, &orders); err != nil {
			log.Println("GetIncomingOrders error:", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		incoming := make([]models.IncomingOrder, 0, len(orders))
		for _, o := range orders {
			user := getUserByID(ctx, o.UserID, app)
			crop := getCropByID(ctx, o.CropID, app)

			incoming = append(incoming, models.IncomingOrder{
				ID:           o.OrderID,
				Buyer:        user.Name,
				Contact:      user.Email,
				Crop:         crop.Name,
				Qty:          o.Quantity,
				Unit:         crop.Unit,
				OrderDate:    o.CreatedAt.Format("2006-01-02"),
				DeliveryDate: estimateDeliveryDate(o.CreatedAt),
				Address:      user.Address,
				Payment:      "pending",
				Status:       string(o.Status),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(
			map[string]interface{}{
				"success": true,
				"orders":  incoming,
			},
		)
	}
}

/* ---------------------------------------------------- */
/* Helpers                                              */
/* ---------------------------------------------------- */

func getUserByID(ctx context.Context, id string, app *infra.Deps) models.User {
	var user models.User
	_ = app.DB.FindOne(ctx, usersCollection, bson.M{"userid": id}, &user)
	return user
}

func getCropByID(ctx context.Context, id string, app *infra.Deps) models.Crop {
	var crop models.Crop
	_ = app.DB.FindOne(ctx, cropsCollection, bson.M{"cropid": id}, &crop)
	return crop
}

func estimateDeliveryDate(created time.Time) string {
	return created.Add(72 * time.Hour).Format("2006-01-02")
}
