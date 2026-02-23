package farms

import (
	"context"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

/* ---------------------------------------------------- */
/* Orders placed BY the current user (buyer)            */
/* ---------------------------------------------------- */

func GetMyFarmOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		var orders []models.FarmOrder
		if err := app.DB.FindMany(
			ctx,
			farmOrdersCollection,
			bson.M{"userid": userID},
			&orders,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch orders",
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"orders":  orders,
		})
	}
}

/* ---------------------------------------------------- */
/* Orders coming INTO farms owned by the farmer         */
/* ---------------------------------------------------- */

func GetIncomingFarmOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		// 1. Fetch farms owned by this user
		var farms []models.Farm
		if err := app.DB.FindMany(
			ctx,
			farmsCollection,
			bson.M{"createdBy": userID},
			&farms,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch farms",
			})
			return
		}

		farmIDs := make([]string, 0, len(farms))
		for _, f := range farms {
			farmIDs = append(farmIDs, f.FarmID)
		}

		if len(farmIDs) == 0 {
			utils.RespondWithJSON(w, http.StatusOK, utils.M{
				"success": true,
				"orders":  []OrderDisplay{},
			})
			return
		}

		// 2. Fetch orders for those farms
		var orders []models.FarmOrder
		if err := app.DB.FindMany(
			ctx,
			farmOrdersCollection,
			bson.M{"farmid": bson.M{"$in": farmIDs}},
			&orders,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to fetch orders",
			})
			return
		}

		// 3. Build frontend-friendly response
		displayOrders := make([]OrderDisplay, 0, len(orders))
		for _, o := range orders {
			user := fetchUserByID(ctx, o.UserID, app)
			crop := fetchCropByID(ctx, o.CropID, app)

			displayOrders = append(displayOrders, OrderDisplay{
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

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"orders":  displayOrders,
		})
	}
}

func fetchUserByID(ctx context.Context, id string, app *infra.Deps) models.User {
	var user models.User

	if id == "" {
		return user
	}

	err := app.DB.FindOne(
		ctx,
		usersCollection,
		bson.M{"userid": id},
		&user,
	)
	if err != nil {
		return models.User{}
	}

	return user
}

func fetchCropByID(ctx context.Context, id string, app *infra.Deps) models.Crop {
	var crop models.Crop

	if id == "" {
		return crop
	}

	err := app.DB.FindOne(
		ctx,
		cropsCollection,
		bson.M{"cropid": id},
		&crop,
	)
	if err != nil {
		return models.Crop{}
	}

	return crop
}
