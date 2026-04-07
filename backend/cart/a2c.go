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
			log.Println("AddToCart decode error:", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if item.ItemID == "" || item.Quantity <= 0 {
			http.Error(w, "Missing or invalid fields: itemId and quantity required", http.StatusBadRequest)
			return
		}

		item.UserID = userID

		// Look up and validate item details from database
		itemDetails, err := lookupItemDetails(ctx, item.ItemID, app)
		if err != nil {
			log.Println("AddToCart lookup error:", err)
			http.Error(w, "Item not found or unavailable: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Check if requested quantity is available
		if item.Quantity > itemDetails.Available {
			http.Error(w, "Requested quantity exceeds available stock", http.StatusBadRequest)
			return
		}

		// Populate item with verified backend data
		item.ItemName = itemDetails.Name
		item.ItemType = itemDetails.Type
		item.Unit = itemDetails.Unit
		item.Price = int64(itemDetails.Price * 100) // Convert rupees to paise (int64)
		// Use provided category or infer from lookup
		if item.Category == "" {
			item.Category = itemDetails.Category
		}
		if itemDetails.EntityType != "" {
			item.EntityID = itemDetails.EntityID
			item.EntityName = itemDetails.EntityName
			item.EntityType = itemDetails.EntityType
		}

		filter := bson.M{
			"userId":     userID,
			"itemId":     item.ItemID,
			"category":   item.Category,
			"entityId":   item.EntityID,
			"entityType": item.EntityType,
		}

		update := bson.M{
			"$inc": bson.M{
				"quantity": item.Quantity,
			},
			"$setOnInsert": bson.M{
				"userId":     userID,
				"itemId":     item.ItemID,
				"itemName":   item.ItemName,
				"itemType":   item.ItemType,
				"unit":       item.Unit,
				"price":      item.Price,
				"category":   item.Category,
				"entityId":   item.EntityID,
				"entityName": item.EntityName,
				"entityType": item.EntityType,
				"addedAt":    time.Now(),
			},
		}

		if err := app.DB.Upsert(ctx, cartCollection, filter, update); err != nil {
			log.Println("AddToCart Upsert error:", err)
			http.Error(w, "Failed to add to cart", http.StatusInternalServerError)
			return
		}

		groupedCart, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, groupedCart)
	}
}

/* ───────────────────────── Update Cart ───────────────────────── */

func UpdateCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			Category string            `json:"category"`
			Items    []models.CartItem `json:"items"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Println("UpdateCart decode error:", err)
			http.Error(w, "Invalid JSON request", http.StatusBadRequest)
			return
		}

		if payload.Category == "" {
			http.Error(w, "Category is required", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if _, err := app.DB.Delete(
			ctx,
			cartCollection,
			bson.M{
				"userId":   userID,
				"category": payload.Category,
			},
		); err != nil {
			log.Println("UpdateCart Delete error:", err)
			http.Error(w, "Failed to clear cart category", http.StatusInternalServerError)
			return
		}

		if len(payload.Items) > 0 {
			now := time.Now()
			docs := make([]any, 0, len(payload.Items))

			for _, it := range payload.Items {
				if it.ItemID == "" || it.Quantity <= 0 {
					continue
				}
				it.UserID = userID
				it.Category = payload.Category
				it.AddedAt = now
				docs = append(docs, it)
			}

			if len(docs) > 0 {
				if err := app.DB.InsertMany(ctx, cartCollection, docs); err != nil {
					log.Println("UpdateCart InsertMany error:", err)
					http.Error(w, "Failed to update cart", http.StatusInternalServerError)
					return
				}
			}
		}

		groupedCart, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			http.Error(w, "Failed to fetch updated cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, groupedCart)
	}
}

/* ───────────────────────── Checkout Hooks ───────────────────────── */

func InitiateCheckout(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"status": "checkout_initiated",
		})
	}
}

func CreateCheckoutSession(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var payload struct {
			Address       string  `json:"address"`
			PaymentMethod string  `json:"paymentMethod"`
			Coupon        string  `json:"coupon"`
			Discount      float64 `json:"discount"`
		}

		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			log.Println("CreateCheckoutSession decode error:", err)
			http.Error(w, "Invalid session data", http.StatusBadRequest)
			return
		}

		if payload.Address == "" {
			http.Error(w, "Address is required", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Fetch user's cart items grouped by category
		groupedItems, err := getGroupedCart(ctx, userID, "", app)
		if err != nil {
			http.Error(w, "Failed to retrieve cart", http.StatusInternalServerError)
			return
		}

		if len(groupedItems) == 0 {
			http.Error(w, "Cart is empty", http.StatusBadRequest)
			return
		}

		// Calculate totals from cart items (CRITICAL FIX: handle int64 prices)
		var subtotal int64 = 0
		var tax int64 = 0
		for _, items := range groupedItems {
			for _, item := range items {
				subtotal += item.Price * int64(item.Quantity)
			}
		}

		// Apply discount if provided (convert float64 to int64)
		discountAmount := int64(payload.Discount * 100) // Convert rupees to paise
		discountedSubtotal := subtotal - discountAmount
		if discountedSubtotal < 0 {
			discountedSubtotal = 0
		}

		// Simple tax calculation (5% on discounted amount)
		tax = int64(float64(discountedSubtotal) * 0.05)
		delivery := int64(2000) // 20 rupees = 2000 paise
		total := discountedSubtotal + tax + delivery

		session := models.CheckoutSession{
			UserID:        userID,
			Items:         groupedItems,
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Subtotal:      subtotal,
			Tax:           tax,
			Delivery:      delivery,
			Discount:      discountAmount,
			Total:         total,
			CreatedAt:     time.Now(),
		}

		utils.RespondWithJSON(w, http.StatusCreated, session)
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

/* ───────────────────────── Get User Orders ───────────────────────── */

func GetMyOrders(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var orders []models.Order
		if err := app.DB.FindMany(ctx, ordersCollection, bson.M{"userId": userID}, &orders); err != nil {
			log.Println("GetMyOrders FindMany error:", err)
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"orders": orders,
		})
	}
}
