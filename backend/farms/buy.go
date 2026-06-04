package farms

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"naevis/auditlog"
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

type BulkOrdersRequest struct {
	OrderIDs []string `json:"orderIds"`
}

type BulkOrdersResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

/* ---------------------------------------------------- */
/* Helpers                                              */
/* ---------------------------------------------------- */

func orderStatusTransitions() map[string][]string {
	return map[string][]string{
		"pending":   {"accepted", "rejected"},
		"accepted":  {"paid", "rejected"},
		"paid":      {"delivered"},
		"rejected":  {},
		"delivered": {},
	}
}

func isValidOrderTransition(oldStatus, newStatus string) bool {
	allowedNext, ok := orderStatusTransitions()[oldStatus]
	if !ok {
		return false
	}

	for _, status := range allowedNext {
		if status == newStatus {
			return true
		}
	}

	return false
}

func auditActionForStatus(newStatus string) string {
	switch newStatus {
	case "accepted":
		return models.AuditActionOrderAccept
	case "rejected":
		return models.AuditActionOrderReject
	case "paid":
		return models.AuditActionOrderMarkPaid
	case "delivered":
		return models.AuditActionOrderMarkDeliver
	default:
		return ""
	}
}

func toInt(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case int32:
		return int(n), true
	case int64:
		return int(n), true
	case float64:
		return int(n), true
	default:
		return 0, false
	}
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

		// Atomic decrement to prevent concurrent overselling.
		var updatedCrop bson.M
		err := app.DB.FindOneAndUpdate(
			ctx,
			cropsCollection,
			bson.M{
				"farmid":     farmID,
				"cropid":     cropID,
				"quantity":   bson.M{"$gt": 0},
				"outOfStock": false,
			},
			bson.M{
				"$inc": bson.M{"quantity": -1},
				"$set": bson.M{"updatedAt": time.Now()},
			},
			&updatedCrop,
		)

		if err != nil {
			utils.RespondWithJSON(
				w,
				http.StatusBadRequest,
				utils.M{"success": false, "message": "Crop not available or already out of stock"},
			)
			return
		}

		if quantity, ok := toInt(updatedCrop["quantity"]); ok && quantity == 0 {
			_ = app.DB.UpdateOne(
				ctx,
				cropsCollection,
				bson.M{"farmid": farmID, "cropid": cropID},
				bson.M{"$set": bson.M{"outOfStock": true, "updatedAt": time.Now()}},
			)
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{"success": true})
	}
}

/* ---------------------------------------------------- */
/* Order status updates                                 */
/* ---------------------------------------------------- */

func updateOrderStatus(
	w http.ResponseWriter,
	r *http.Request,
	orderID string,
	newStatus string,
	app *infra.Deps,
) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID := utils.GetUserIDFromRequest(r)
	if userID == "" {
		utils.RespondWithJSON(
			w,
			http.StatusUnauthorized,
			utils.M{"success": false, "message": "Unauthorized"},
		)
		return
	}

	var order models.FarmOrder
	if err := app.DB.FindOne(ctx, farmOrdersCollection, bson.M{"orderid": orderID}, &order); err != nil {
		utils.RespondWithJSON(
			w,
			http.StatusNotFound,
			utils.M{"success": false, "message": "Order not found"},
		)
		return
	}

	var farm models.Farm
	if err := app.DB.FindOne(ctx, farmsCollection, bson.M{"farmid": order.FarmID}, &farm); err != nil {
		utils.RespondWithJSON(
			w,
			http.StatusNotFound,
			utils.M{"success": false, "message": "Farm not found"},
		)
		return
	}

	if farm.CreatedBy != userID {
		utils.RespondWithJSON(
			w,
			http.StatusForbidden,
			utils.M{"success": false, "message": "Forbidden: Only farm owner can update order status"},
		)
		return
	}

	oldStatus := string(order.Status)
	if !isValidOrderTransition(oldStatus, newStatus) {
		utils.RespondWithJSON(
			w,
			http.StatusBadRequest,
			utils.M{
				"success": false,
				"message": "Invalid status transition from " + oldStatus + " to " + newStatus,
			},
		)
		return
	}

	err := app.DB.UpdateOne(
		ctx,
		farmOrdersCollection,
		bson.M{"orderid": orderID},
		bson.M{"$set": bson.M{"status": newStatus, "updatedAt": time.Now()}},
	)
	if err != nil {
		utils.RespondWithJSON(
			w,
			http.StatusBadRequest,
			utils.M{"success": false, "message": "Order not found or unchanged"},
		)
		return
	}

	auditAction := auditActionForStatus(newStatus)
	if auditAction != "" {
		auditlog.LogAction(
			ctx,
			app,
			r,
			userID,
			auditAction,
			"farm_order",
			orderID,
			"success",
			map[string]interface{}{
				"oldStatus": oldStatus,
				"newStatus": newStatus,
			},
		)
	}

	utils.RespondWithJSON(
		w,
		http.StatusOK,
		utils.M{"success": true, "status": newStatus},
	)
}

func AcceptOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, r, ps.ByName("id"), "accepted", app)
	}
}

func RejectOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, r, ps.ByName("id"), "rejected", app)
	}
}

func MarkOrderDelivered(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, r, ps.ByName("id"), "delivered", app)
	}
}

func MarkOrderPaid(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		updateOrderStatus(w, r, ps.ByName("id"), "paid", app)
	}
}

/* ---------------------------------------------------- */
/* Bulk order status updates                            */
/* ---------------------------------------------------- */

func BulkAcceptOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		bulkUpdateOrders(w, r, "accepted", app)
	}
}

func BulkRejectOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		bulkUpdateOrders(w, r, "rejected", app)
	}
}

func BulkMarkOrdersDelivered(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		bulkUpdateOrders(w, r, "delivered", app)
	}
}

func bulkUpdateOrders(w http.ResponseWriter, r *http.Request, newStatus string, app *infra.Deps) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID := utils.GetUserIDFromRequest(r)
	if userID == "" {
		utils.RespondWithJSON(
			w,
			http.StatusUnauthorized,
			utils.M{"success": false, "message": "Unauthorized"},
		)
		return
	}

	var req BulkOrdersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	if len(req.OrderIDs) == 0 {
		utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
			"success": false,
			"message": "No order IDs provided",
		})
		return
	}

	var ownedFarms []models.Farm
	if err := app.DB.FindMany(ctx, farmsCollection, bson.M{"createdBy": userID}, &ownedFarms); err != nil {
		utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
			"success": false,
			"message": "Failed to fetch farms",
		})
		return
	}

	farmIDs := make([]string, 0, len(ownedFarms))
	for _, f := range ownedFarms {
		farmIDs = append(farmIDs, f.FarmID)
	}

	response := BulkOrdersResponse{Success: true}
	errorsList := make([]string, 0)

	for _, orderID := range req.OrderIDs {
		var order models.FarmOrder
		if err := app.DB.FindOne(ctx, farmOrdersCollection, bson.M{"orderid": orderID}, &order); err != nil {
			response.Failed++
			errorsList = append(errorsList, fmt.Sprintf("Order %s not found", orderID))
			continue
		}

		authorized := false
		for _, farmID := range farmIDs {
			if order.FarmID == farmID {
				authorized = true
				break
			}
		}
		if !authorized {
			response.Failed++
			errorsList = append(errorsList, fmt.Sprintf("Order %s unauthorized", orderID))
			continue
		}

		oldStatus := string(order.Status)
		if !isValidOrderTransition(oldStatus, newStatus) {
			response.Failed++
			errorsList = append(errorsList, fmt.Sprintf("Order %s: invalid transition from %s to %s", orderID, oldStatus, newStatus))
			continue
		}

		if err := app.DB.UpdateOne(
			ctx,
			farmOrdersCollection,
			bson.M{"orderid": orderID},
			bson.M{"$set": bson.M{"status": newStatus, "updatedAt": time.Now()}},
		); err != nil {
			response.Failed++
			errorsList = append(errorsList, fmt.Sprintf("Order %s: update failed", orderID))
			continue
		}

		response.Updated++

		auditAction := auditActionForStatus(newStatus)
		if auditAction != "" {
			auditlog.LogAction(
				ctx,
				app,
				r,
				userID,
				auditAction,
				"farm_order",
				orderID,
				"success",
				map[string]interface{}{
					"oldStatus": oldStatus,
					"newStatus": newStatus,
				},
			)
		}
	}

	if len(errorsList) > 0 {
		response.Errors = errorsList
	}

	if response.Updated > 0 {
		response.Message = fmt.Sprintf("Successfully updated %d order(s)", response.Updated)
	} else {
		response.Success = false
		response.Message = "No orders were updated"
	}

	utils.RespondWithJSON(w, http.StatusOK, response)
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
