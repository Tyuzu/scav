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

func InitiateCheckout(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var items []models.CartItem
		err := app.DB.FindMany(
			ctx,
			cartCollection,
			bson.M{"userId": userID},
			&items,
		)
		if err != nil {
			http.Error(w, "Failed to fetch cart", http.StatusInternalServerError)
			return
		}

		if len(items) == 0 {
			http.Error(w, "Cart is empty", http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"status": "ok",
			"items":  len(items),
		})
	}
}
func CreateCheckoutSession(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			Address       string                       `json:"address"`
			Items         map[string][]models.CartItem `json:"items"`
			PaymentMethod string                       `json:"paymentMethod"`
			Coupon        string                       `json:"coupon"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if payload.Address == "" {
			http.Error(w, "Address required", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Flatten items from grouped structure
		var allItems []models.CartItem
		for _, categoryItems := range payload.Items {
			allItems = append(allItems, categoryItems...)
		}

		if len(allItems) == 0 {
			http.Error(w, "No items provided", http.StatusBadRequest)
			return
		}

		var subtotal int64 = 0
		var validatedItems []models.CartItem

		// 🔒 SECURITY: Get prices from database, never trust frontend
		// Recalculate from source of truth - verify each item
		for _, item := range allItems {
			if item.ItemID == "" || item.Quantity <= 0 {
				continue
			}

			details, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil {
				http.Error(w, "Item "+item.ItemID+" not found", http.StatusBadRequest)
				return
			}

			// 🔒 Verify quantity is available
			if item.Quantity > details.Available {
				http.Error(w, "Insufficient stock for "+details.Name, http.StatusBadRequest)
				return
			}

			// 🔒 SECURITY: Use price from database, ignore frontend price
			price := int64(details.Price * 100)
			subtotal += price * int64(item.Quantity)

			// Include validated items in response with server-calculated prices
			// 🔒 Use entity info from database, not frontend
			validatedItems = append(validatedItems, models.CartItem{
				ItemID:     item.ItemID,
				ItemName:   details.Name,
				Quantity:   item.Quantity,
				Price:      price, // 🔒 Server price, not frontend
				Category:   details.Category,
				EntityID:   details.EntityID,   // 🔒 From database
				EntityType: details.EntityType, // 🔒 From database
			})
		}

		// 🔒 Apply coupon (server-side only)
		discount := int64(0)
		if payload.Coupon != "" {
			couponRes, err := validateCouponServer(ctx, payload.Coupon, subtotal, app)
			if err != nil {
				// Don't fail checkout if coupon is invalid - just skip it
				log.Println("Coupon validation error:", err)
			} else if couponRes != nil {
				discount = couponRes.DiscountAmount
			}
		}

		totalAfterDiscount := subtotal - discount
		if totalAfterDiscount < 0 {
			totalAfterDiscount = 0
		}

		// Charges
		tax := int64(float64(totalAfterDiscount) * 0.05)
		delivery := int64(2000) // ₹20
		total := totalAfterDiscount + tax + delivery

		session := map[string]any{
			"items":     validatedItems,
			"subtotal":  subtotal,
			"discount":  discount,
			"tax":       tax,
			"delivery":  delivery,
			"total":     total,
			"address":   payload.Address,
			"createdAt": time.Now(),
		}

		utils.RespondWithJSON(w, http.StatusCreated, session)
	}
}
