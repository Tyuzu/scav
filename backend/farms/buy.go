package farms

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* DTOs                                                 */
/* ---------------------------------------------------- */

type OrderDisplay struct {
	ID           string `json:"id"`
	Buyer        string `json:"buyer"`
	Contact      string `json:"contact"`
	Crop         string `json:"crop"`
	Qty          int    `json:"qty"`
	Unit         string `json:"unit"`
	OrderDate    string `json:"orderDate"`
	DeliveryDate string `json:"deliveryDate"`
	Address      string `json:"address"`
	Payment      string `json:"payment"`
	Status       string `json:"status"`
}

/* ---------------------------------------------------- */
/* Buy crop                                             */
/* ---------------------------------------------------- */

func BuyCrop(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		farmID := ps.ByName("farmid")
		cropID := ps.ByName("cropid")

		filter := bson.M{
			"farmid":           farmID,
			"crops.cropid":     cropID,
			"crops.quantity":   bson.M{"$gt": 0},
			"crops.outOfStock": false,
		}

		update := bson.M{
			"$inc": bson.M{"crops.$.quantity": -1},
			"$set": bson.M{"crops.$.updatedAt": time.Now()},
		}

		err := app.DB.UpdateOne(ctx, farmsCollection, filter, update)
		if err != nil {
			utils.RespondWithJSON(
				w,
				http.StatusBadRequest,
				utils.M{"success": false, "message": "Crop not available or already out of stock"},
			)
			return
		}

		filterZero := bson.M{
			"farmid":         farmID,
			"crops.cropid":   cropID,
			"crops.quantity": 0,
		}

		_ = app.DB.UpdateOne(
			ctx,
			farmsCollection,
			filterZero,
			bson.M{"$set": bson.M{"crops.$.outOfStock": true}},
		)

		utils.RespondWithJSON(w, http.StatusOK, utils.M{"success": true})
	}
}

/* ---------------------------------------------------- */
/* Order status updates                                 */
/* ---------------------------------------------------- */

func updateOrderStatus(
	w http.ResponseWriter,
	orderID string,
	newStatus string,
	app *infra.Deps,
) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := app.DB.UpdateOne(
		ctx,
		farmOrdersCollection,
		bson.M{"orderid": orderID},
		bson.M{"$set": bson.M{"status": newStatus}},
	)

	if err != nil {
		utils.RespondWithJSON(
			w,
			http.StatusBadRequest,
			utils.M{"success": false, "message": "Order not found or unchanged"},
		)
		return
	}

	utils.RespondWithJSON(
		w,
		http.StatusOK,
		utils.M{"success": true, "status": newStatus},
	)
}

func AcceptOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, ps.ByName("id"), "accepted", app)
	}
}

func RejectOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, ps.ByName("id"), "rejected", app)
	}
}

func MarkOrderDelivered(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, ps.ByName("id"), "delivered", app)
	}
}

func MarkOrderPaid(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, ps.ByName("id"), "paid", app)
	}
}

/* ---------------------------------------------------- */
/* Download receipt                                     */
/* ---------------------------------------------------- */

func DownloadReceipt(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		orderID := ps.ByName("id")

		var order models.FarmOrder
		if err := app.DB.FindOne(ctx, farmOrdersCollection, bson.M{"orderid": orderID}, &order); err != nil {
			utils.RespondWithJSON(
				w,
				http.StatusNotFound,
				utils.M{"success": false, "message": "Order not found"},
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			utils.M{"success": true, "receipt": order},
		)
	}
}

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
