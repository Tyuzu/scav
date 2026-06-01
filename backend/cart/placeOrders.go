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

		var payload struct {
			Address       string                       `json:"address"`
			Items         map[string][]models.CartItem `json:"items"`
			PaymentMethod string                       `json:"paymentMethod"`
			Coupon        string                       `json:"coupon"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid checkout payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if payload.Address == "" {
			http.Error(w, "Address is required", http.StatusBadRequest)
			return
		}

		if len(payload.Items) == 0 {
			http.Error(w, "No items in checkout", http.StatusBadRequest)
			return
		}

		// Flatten items from grouped structure
		var allItems []models.CartItem
		for category, items := range payload.Items {
			for _, item := range items {
				item.Category = category // Ensure category is set
				allItems = append(allItems, item)
			}
		}

		// Validate all items before processing order
		var subtotal int64 = 0
		// Rebuild items with validated data from database
		validatedGroupedItems := make(map[string][]models.CartItem)

		for _, item := range allItems {
			// Lookup current item details to verify price and availability
			details, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil {
				http.Error(w, "Item "+item.ItemID+" is no longer available", http.StatusBadRequest)
				return
			}

			// 🔒 SECURITY: Get price from database, never trust frontend
			price := int64(details.Price * 100)

			// Verify quantity is still available
			if item.Quantity > details.Available {
				http.Error(w, "Requested quantity of "+details.Name+" exceeds available stock", http.StatusBadRequest)
				return
			}

			subtotal += price * int64(item.Quantity)

			// 🔒 Store validated item with database entity info
			category := details.Category
			validatedGroupedItems[category] = append(validatedGroupedItems[category], models.CartItem{
				ItemID:     item.ItemID,
				ItemName:   details.Name,
				Quantity:   item.Quantity,
				Price:      price,
				Category:   category,
				EntityID:   details.EntityID,   // 🔒 From database
				EntityType: details.EntityType, // 🔒 From database
			})
		}

		// 🔒 Validate coupon (server-side only)
		discount := int64(0)
		if payload.Coupon != "" {
			couponRes, err := validateCouponServer(ctx, payload.Coupon, subtotal, app)
			if err != nil {
				log.Println("Coupon validation error:", err)
				// Don't fail - just skip coupon
			} else if couponRes != nil {
				discount = couponRes.DiscountAmount
			}
		}

		totalAfterDiscount := subtotal - discount
		if totalAfterDiscount < 0 {
			totalAfterDiscount = 0
		}

		// Calculate charges
		tax := int64(float64(totalAfterDiscount) * 0.05)
		delivery := int64(2000) // ₹20
		total := totalAfterDiscount + tax + delivery

		// Create checkout session object with validated items
		checkout := models.CheckoutSession{
			UserID:        userID,
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Items:         validatedGroupedItems, // 🔒 Use validated items with entity info
			Subtotal:      subtotal,
			Discount:      discount,
			Tax:           tax,
			Delivery:      delivery,
			Total:         total,
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

		/* -------- Publish CheckoutStarted Event -------- */

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
		// Calculate total price for this farm order
		var farmOrderPrice int64 = 0
		for _, item := range items {
			farmOrderPrice += item.Price * int64(item.Quantity)
		}

		order := models.FarmOrder{
			OrderID:         "ORD" + utils.GenerateRandomDigitString(9),
			UserID:          checkout.UserID,
			FarmID:          farmID,
			Status:          "pending",
			ApprovedBy:      []string{},
			Items:           map[string][]models.CartItem{"crops": items},
			CreatedAt:       time.Now(),
			Quantity:        len(items),
			PriceAtPurchase: float64(farmOrderPrice) / 100, // Convert paise to rupees
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
