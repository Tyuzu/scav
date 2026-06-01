package cart

import (
	"context"
	"encoding/json"
	"log"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func UpdateCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			Items []models.CartItem `json:"items"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Clear existing cart
		if _, err := app.DB.Delete(ctx, cartCollection, bson.M{"userId": userID}); err != nil {
			http.Error(w, "Failed to clear cart", http.StatusInternalServerError)
			return
		}

		now := time.Now()
		var docs []any

		for _, it := range payload.Items {
			if it.ItemID == "" || it.Quantity <= 0 {
				continue
			}

			// 🔒 Re-fetch item details (DO NOT trust client)
			details, err := lookupItemDetails(ctx, it.ItemID, app)
			if err != nil {
				continue // skip invalid items
			}

			// 🔒 Enforce stock limit
			if it.Quantity > details.Available {
				it.Quantity = details.Available
			}
			if it.Quantity == 0 {
				continue
			}

			doc := models.CartItem{
				UserID:   userID,
				ItemID:   it.ItemID,
				ItemName: details.Name,
				ItemType: details.Type,
				Unit:     details.Unit,
				Category: details.Category,
				Price:    int64(details.Price * 100), // server price
				Quantity: it.Quantity,
				AddedAt:  now,
			}

			docs = append(docs, doc)
		}

		if len(docs) > 0 {
			if err := app.DB.InsertMany(ctx, cartCollection, docs); err != nil {
				http.Error(w, "Failed to update cart", http.StatusInternalServerError)
				return
			}
		}

		// Return fresh cart
		var updated []models.CartItem
		err := app.DB.FindMany(ctx, cartCollection, bson.M{"userId": userID}, &updated)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, updated)
	}
}

/* ───────────────────────── Cart Fetch Helper ───────────────────────── */

func getGroupedCart(
	ctx context.Context,
	userID string,
	category string,
	app *infra.Deps,
) (map[string][]models.CartItem, error) {

	filter := bson.M{"userId": userID}
	if category != "" {
		filter["category"] = category
	}

	var items []models.CartItem
	if err := app.DB.FindMany(ctx, cartCollection, filter, &items); err != nil {
		log.Println("getGroupedCart FindMany error:", err)
		return nil, err
	}

	grouped := make(map[string][]models.CartItem)
	for _, item := range items {
		grouped[item.Category] = append(grouped[item.Category], item)
	}

	return grouped, nil
}

/* ───────────────────────── Update Item Quantity ───────────────────────── */

// UpdateItemQuantity updates the quantity of a specific item in the cart
func UpdateItemQuantity(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			ItemID     string `json:"itemId"`
			Category   string `json:"category"`
			Quantity   int    `json:"quantity"`
			EntityID   string `json:"entityId,omitempty"`
			EntityType string `json:"entityType,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Println("UpdateItemQuantity decode error:", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if payload.ItemID == "" || payload.Category == "" {
			http.Error(w, "ItemID and Category are required", http.StatusBadRequest)
			return
		}

		// Validate item exists and check stock
		itemDetails, err := lookupItemDetails(ctx, payload.ItemID, app)
		if err != nil {
			http.Error(w, "Item not found or unavailable", http.StatusBadRequest)
			return
		}

		if payload.Quantity <= 0 {
			http.Error(w, "Quantity must be greater than 0", http.StatusBadRequest)
			return
		}

		// Check if requested quantity is available
		if payload.Quantity > itemDetails.Available {
			http.Error(w, "Requested quantity exceeds available stock", http.StatusBadRequest)
			return
		}

		filter := bson.M{
			"userId":   userID,
			"itemId":   payload.ItemID,
			"category": payload.Category,
		}

		if payload.EntityID != "" {
			filter["entityId"] = payload.EntityID
		}
		if payload.EntityType != "" {
			filter["entityType"] = payload.EntityType
		}

		update := bson.M{
			"$set": bson.M{
				"quantity": payload.Quantity,
			},
		}

		if err := app.DB.Update(ctx, cartCollection, filter, update); err != nil {
			log.Println("UpdateItemQuantity Update error:", err)
			http.Error(w, "Failed to update item quantity", http.StatusInternalServerError)
			return
		}

		groupedCart, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}
