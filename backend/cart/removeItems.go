package cart

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/utils"
)

/* ───────────────────────── Remove From Cart ───────────────────────── */

// RemoveFromCart removes a specific item from the user's cart
func RemoveFromCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			ItemID     string `json:"itemId"`
			Category   string `json:"category"`
			EntityID   string `json:"entityId,omitempty"`
			EntityType string `json:"entityType,omitempty"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Println("RemoveFromCart decode error:", err)
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

		filter := bson.M{
			"userId":   userID,
			"itemId":   payload.ItemID,
			"category": payload.Category,
		}

		// Add optional filters if provided
		if payload.EntityID != "" {
			filter["entityId"] = payload.EntityID
		}
		if payload.EntityType != "" {
			filter["entityType"] = payload.EntityType
		}

		if _, err := app.DB.Delete(ctx, cartCollection, filter); err != nil {
			log.Println("RemoveFromCart Delete error:", err)
			http.Error(w, "Failed to remove item from cart", http.StatusInternalServerError)
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

/* ───────────────────────── Clear Cart ───────────────────────── */

// ClearCart removes all items from the user's cart
func ClearCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if _, err := app.DB.Delete(ctx, cartCollection, bson.M{"userId": userID}); err != nil {
			log.Println("ClearCart Delete error:", err)
			http.Error(w, "Failed to clear cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"message": "Cart cleared successfully",
		})
	}
}
