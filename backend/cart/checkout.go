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

/* ───────────────────────── Order Placement ───────────────────────── */

func PlaceOrder(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var checkout models.CheckoutSession
		if err := json.NewDecoder(r.Body).Decode(&checkout); err != nil {
			http.Error(w, "Invalid checkout payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if checkout.Address == "" {
			http.Error(w, "Address is required", http.StatusBadRequest)
			return
		}

		if len(checkout.Items) == 0 {
			http.Error(w, "No items in checkout", http.StatusBadRequest)
			return
		}

		checkout.UserID = userID

		// Validate all items before processing order
		for category, items := range checkout.Items {
			for _, item := range items {
				// Lookup current item details to verify price and availability
				details, err := lookupItemDetails(ctx, item.ItemID, app)
				if err != nil {
					http.Error(w, "Item "+item.ItemID+" is no longer available", http.StatusBadRequest)
					return
				}

				// Verify price hasn't changed significantly (allow small floating point variations)
				convertedPrice := int64(details.Price * 100) // Convert rupees to paise
				if item.Price != convertedPrice {
					log.Printf("Price mismatch for item %s: expected %d paise, got %d paise\n", item.ItemID, convertedPrice, item.Price)
					return
				}

				// Verify quantity is still available
				if item.Quantity > details.Available {
					http.Error(w, "Requested quantity of "+item.ItemName+" exceeds available stock", http.StatusBadRequest)
					return
				}

				// Verify category matches
				if item.Category != category {
					http.Error(w, "Item category mismatch", http.StatusBadRequest)
					return
				}
			}
		}

		farmOrders, err := processFarmOrders(ctx, checkout, app)
		if err != nil {
			http.Error(w, "Failed to process farm orders", http.StatusInternalServerError)
			return
		}

		genOrder, err := processGeneralOrders(ctx, checkout, app)
		if err != nil {
			http.Error(w, "Failed to process orders", http.StatusInternalServerError)
			return
		}

		if _, err := app.DB.Delete(ctx, cartCollection, bson.M{"userId": userID}); err != nil {
			log.Println("Cart cleanup error:", err)
		}

		resp := map[string]any{
			"success":    true,
			"farmOrders": farmOrders,
		}
		if genOrder != nil {
			resp["order"] = genOrder
		}

		utils.RespondWithJSON(w, http.StatusCreated, resp)
	}
}

func processFarmOrders(ctx context.Context, checkout models.CheckoutSession, app *infra.Deps) ([]models.FarmOrder, error) {
	cropItems, ok := checkout.Items["crops"]
	if !ok || len(cropItems) == 0 {
		return nil, nil
	}

	grouped := make(map[string][]models.CartItem)
	for _, item := range cropItems {
		if item.EntityType == "farm" {
			grouped[item.EntityID] = append(grouped[item.EntityID], item)
		}
	}

	var orders []models.FarmOrder

	for farmID, items := range grouped {
		order := models.FarmOrder{
			OrderID:    "ORD" + utils.GenerateRandomDigitString(9),
			UserID:     checkout.UserID,
			FarmID:     farmID,
			Status:     "pending",
			ApprovedBy: []string{},
			Items:      map[string][]models.CartItem{"crops": items},
			CreatedAt:  time.Now(),
			Quantity:   len(items),
		}

		if err := app.DB.Insert(ctx, farmOrdersCollection, order); err != nil {
			log.Println("FarmOrders insert error:", err)
			return nil, err
		}
		orders = append(orders, order)
	}
	return orders, nil
}

func processGeneralOrders(ctx context.Context, checkout models.CheckoutSession, app *infra.Deps) (*models.Order, error) {
	nonCropItems := make(map[string][]models.CartItem)
	for category, items := range checkout.Items {
		if category != "crops" && len(items) > 0 {
			nonCropItems[category] = items
		}
	}
	if len(nonCropItems) == 0 {
		return nil, nil
	}

	order := models.Order{
		OrderID:       "ORD" + utils.GenerateRandomDigitString(9),
		UserID:        checkout.UserID,
		Items:         nonCropItems,
		Address:       checkout.Address,
		PaymentMethod: checkout.PaymentMethod,
		Total:         checkout.Total,
		Status:        "pending",
		ApprovedBy:    []string{},
		CreatedAt:     time.Now(),
	}

	if err := app.DB.Insert(ctx, ordersCollection, order); err != nil {
		log.Println("Order insert error:", err)
		return nil, err
	}
	return &order, nil
}
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
			Address       string `json:"address"`
			PaymentMethod string `json:"paymentMethod"`
			Coupon        string `json:"coupon"`
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

		// Fetch cart
		var items []models.CartItem
		err := app.DB.FindMany(
			ctx,
			cartCollection,
			bson.M{"userId": userID},
			&items,
		)
		if err != nil || len(items) == 0 {
			http.Error(w, "Cart empty", http.StatusBadRequest)
			return
		}

		var subtotal int64 = 0

		// 🔒 Recalculate from source of truth
		for _, item := range items {
			details, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil {
				continue
			}

			price := int64(details.Price * 100)
			subtotal += price * int64(item.Quantity)
		}

		// 🔒 Apply coupon (server-side only)
		couponRes, err := validateCouponServer(ctx, payload.Coupon, subtotal, app)
		if err != nil {
			http.Error(w, "Invalid coupon", http.StatusBadRequest)
			return
		}

		discount := couponRes.DiscountAmount

		totalAfterDiscount := subtotal - discount
		if totalAfterDiscount < 0 {
			totalAfterDiscount = 0
		}

		// Charges
		tax := int64(float64(totalAfterDiscount) * 0.05)
		delivery := int64(2000) // ₹20
		total := totalAfterDiscount + tax + delivery

		session := models.CheckoutSession{
			UserID:        userID,
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Subtotal:      subtotal,
			Discount:      discount,
			Tax:           tax,
			Delivery:      delivery,
			Total:         total,
			CreatedAt:     time.Now(),
		}

		utils.RespondWithJSON(w, http.StatusCreated, session)
	}
}
