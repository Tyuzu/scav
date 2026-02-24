package cart

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

/* ───────────────────────── Add To Cart (Event-Based) ───────────────────────── */

func AddToCart(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		// Accept ONLY itemId and quantity from frontend
		var req struct {
			ItemID   string `json:"itemId"`
			Quantity int    `json:"quantity"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Println("AddToCart decode error:", err)
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if req.ItemID == "" || req.Quantity <= 0 {
			http.Error(w, "Missing or invalid fields", http.StatusBadRequest)
			return
		}

		// Backend looks up item details from database
		itemDetails, err := lookupItemDetails(ctx, req.ItemID, app)
		if err != nil || itemDetails == nil {
			http.Error(w, "Item not found or invalid", http.StatusNotFound)
			return
		}

		// Create enriched cart item with backend-verified data
		cartItem := models.CartItem{
			ItemID:     req.ItemID,
			ItemName:   itemDetails.Name,
			ItemType:   itemDetails.Type,
			Category:   itemDetails.Category,
			Price:      itemDetails.Price, // Backend-verified
			Unit:       itemDetails.Unit,
			EntityID:   itemDetails.EntityID,
			EntityName: itemDetails.EntityName,
			EntityType: itemDetails.EntityType,
		}

		filter := bson.M{
			"userId":   userID,
			"itemId":   req.ItemID,
			"entityId": itemDetails.EntityID,
		}

		update := bson.M{
			"$inc": bson.M{
				"quantity": req.Quantity,
			},
			"$setOnInsert": bson.M{
				"userId":     userID,
				"itemId":     cartItem.ItemID,
				"itemName":   cartItem.ItemName,
				"itemType":   cartItem.ItemType,
				"category":   cartItem.Category,
				"price":      cartItem.Price,
				"unit":       cartItem.Unit,
				"entityId":   cartItem.EntityID,
				"entityName": cartItem.EntityName,
				"entityType": cartItem.EntityType,
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

		// Accept category and array of minimal update objects: {itemId, quantity}
		var payload struct {
			Category string `json:"category"`
			Updates  []struct {
				ItemID   string `json:"itemId"`
				Quantity int    `json:"quantity"`
			} `json:"updates"`
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

		// Clear existing items in this category
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

		// Process updates and look up items
		if len(payload.Updates) > 0 {
			now := time.Now()
			docs := make([]any, 0, len(payload.Updates))

			for _, update := range payload.Updates {
				if update.ItemID == "" || update.Quantity <= 0 {
					continue
				}

				// Look up current item details from database
				itemDetails, err := lookupItemDetails(ctx, update.ItemID, app)
				if err != nil || itemDetails == nil {
					log.Printf("Item lookup failed for %s: %v\n", update.ItemID, err)
					continue // Skip invalid items
				}

				// Create enriched cart item with backend-verified data
				cartItem := models.CartItem{
					UserID:     userID,
					ItemID:     update.ItemID,
					ItemName:   itemDetails.Name,
					ItemType:   itemDetails.Type,
					Category:   payload.Category,
					Price:      itemDetails.Price, // Backend-verified
					Unit:       itemDetails.Unit,
					EntityID:   itemDetails.EntityID,
					EntityName: itemDetails.EntityName,
					EntityType: itemDetails.EntityType,
					Quantity:   update.Quantity,
					AddedAt:    now,
				}
				docs = append(docs, cartItem)
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

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Decode checkout request with items array
		var req struct {
			Address     string `json:"address"`
			CouponCode  string `json:"couponCode"`
			PaymentType string `json:"paymentType"`
			Items       []struct {
				ItemID   string `json:"itemId"`
				Quantity int    `json:"quantity"`
			} `json:"items"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Println("CreateCheckoutSession decode error:", err)
			http.Error(w, "Invalid session data", http.StatusBadRequest)
			return
		}

		// Validate items and calculate totals from backend-verified prices
		var subtotal float64 = 0
		itemsMap := make(map[string][]models.CartItem)

		for _, item := range req.Items {
			// Look up item details from database
			itemDetails, err := lookupItemDetails(ctx, item.ItemID, app)
			if err != nil || itemDetails == nil {
				http.Error(w, fmt.Sprintf("Item %s not found", item.ItemID), http.StatusBadRequest)
				return
			}

			cartItem := models.CartItem{
				UserID:     userID,
				ItemID:     item.ItemID,
				ItemName:   itemDetails.Name,
				ItemType:   itemDetails.Type,
				Category:   itemDetails.Category,
				Price:      itemDetails.Price,
				Unit:       itemDetails.Unit,
				EntityID:   itemDetails.EntityID,
				EntityName: itemDetails.EntityName,
				EntityType: itemDetails.EntityType,
				Quantity:   item.Quantity,
				AddedAt:    time.Now(),
			}

			itemsMap[itemDetails.Category] = append(itemsMap[itemDetails.Category], cartItem)
			subtotal += itemDetails.Price * float64(item.Quantity)
		}

		// Apply coupon if provided
		var discount float64 = 0
		if req.CouponCode != "" {
			// Validate coupon and get discount (implementation depends on coupon service)
			// For now, assume coupon validation returns discount percentage or amount
			// TODO: Call coupon validation service
		}

		// Calculate tax and delivery (backend-determined rates)
		taxRate := 0.10    // 10% tax - adjust as needed
		deliveryFee := 5.0 // Base delivery fee - adjust as needed

		taxable := subtotal - discount
		tax := taxable * taxRate

		session := models.CheckoutSession{
			UserID:        userID,
			Items:         itemsMap,
			Address:       req.Address,
			PaymentMethod: req.PaymentType,
			Subtotal:      subtotal,
			Discount:      discount,
			Tax:           tax,
			Delivery:      deliveryFee,
			Total:         taxable + tax + deliveryFee,
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

		checkout.UserID = userID

		// Verify prices haven't changed since checkout session was created
		// Re-lookup each item and compare prices
		for _, items := range checkout.Items {
			for _, item := range items {
				currentDetails, err := lookupItemDetails(ctx, item.ItemID, app)
				if err != nil || currentDetails == nil {
					http.Error(w, fmt.Sprintf("Item %s no longer available", item.ItemID), http.StatusBadRequest)
					return
				}

				// Check for significant price discrepancy (allow 1% tolerance for rounding)
				priceDiff := (currentDetails.Price - item.Price) / item.Price
				if priceDiff > 0.01 || priceDiff < -0.01 {
					http.Error(w, fmt.Sprintf("Price for %s has changed. Please re-checkout", item.ItemID), http.StatusConflict)
					return
				}

				// Check availability
				if currentDetails.Available < item.Quantity {
					http.Error(w, fmt.Sprintf("Insufficient stock for %s (%d available)", item.ItemName, currentDetails.Available), http.StatusBadRequest)
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

/* ───────────────────────── Order Placement ───────────────────────── */
