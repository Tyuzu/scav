package cart

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

/* ───────────────────────── Add To Cart ───────────────────────── */

func AddToCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var item models.CartItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if item.ItemID == "" || item.Quantity <= 0 {
			http.Error(w, "Invalid item", http.StatusBadRequest)
			return
		}

		itemDetails, err := lookupItemDetails(ctx, item.ItemID, app)
		if err != nil {
			http.Error(w, "Item not found", http.StatusBadRequest)
			return
		}

		if item.Quantity > itemDetails.Available {
			http.Error(w, "Insufficient stock", http.StatusBadRequest)
			return
		}

		item.UserID = userID
		item.ItemName = itemDetails.Name
		item.ItemType = itemDetails.Type
		item.Unit = itemDetails.Unit
		item.Price = int64(itemDetails.Price * 100)
		item.Category = itemDetails.Category
		if item.EntityID == "" {
			item.EntityID = itemDetails.EntityID
		}
		if item.EntityType == "" {
			item.EntityType = itemDetails.EntityType
		}

		// Build filter: match by userId, itemId, AND entity if provided
		filter := bson.M{
			"userId": userID,
			"itemId": item.ItemID,
		}

		// Include entity in filter for unique identification
		if item.EntityID != "" {
			filter["entityId"] = item.EntityID
		}
		if item.EntityType != "" {
			filter["entityType"] = item.EntityType
		}

		update := bson.M{
			"$inc": bson.M{"quantity": item.Quantity},
			"$set": bson.M{
				"price":      item.Price,
				"itemName":   item.ItemName,
				"itemType":   item.ItemType,
				"unit":       item.Unit,
				"category":   item.Category,
				"entityId":   item.EntityID,
				"entityType": item.EntityType,
			},
			"$setOnInsert": bson.M{
				"addedAt": time.Now(),
			},
		}

		if err := app.DB.Upsert(ctx, cartCollection, filter, update); err != nil {
			http.Error(w, "Failed to add to cart", http.StatusInternalServerError)
			return
		}

		/* -------- Publish CartItemAdded Event -------- */

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
	}
}
