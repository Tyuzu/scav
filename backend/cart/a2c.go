package cart

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

/* ───────────────────────── Coupon Validation (SERVER) ───────────────────────── */

type CouponResult struct {
	DiscountAmount int64
}

func validateCouponServer(ctx context.Context, code string, subtotal int64, app *infra.Deps) (*CouponResult, error) {
	if code == "" {
		return &CouponResult{DiscountAmount: 0}, nil
	}

	var coupon struct {
		Code        string  `bson:"code"`
		Active      bool    `bson:"active"`
		ExpiresAt   int64   `bson:"expiresAt"`
		Type        string  `bson:"type"`  // "flat" or "percent"
		Value       float64 `bson:"value"` // ₹ or %
		MaxDiscount float64 `bson:"maxDiscount"`
	}

	err := app.DB.FindOne(ctx, "coupons", bson.M{"code": code}, &coupon)
	if err != nil || !coupon.Active {
		return nil, errors.New("invalid coupon")
	}

	if coupon.ExpiresAt > 0 && time.Now().Unix() > coupon.ExpiresAt {
		return nil, errors.New("coupon expired")
	}

	var discount int64 = 0

	switch coupon.Type {
	case "flat":
		discount = int64(coupon.Value * 100)

	case "percent":
		raw := float64(subtotal) * (coupon.Value / 100)
		discount = int64(raw)

		if coupon.MaxDiscount > 0 {
			max := int64(coupon.MaxDiscount * 100)
			if discount > max {
				discount = max
			}
		}
	}

	if discount > subtotal {
		discount = subtotal
	}

	return &CouponResult{DiscountAmount: discount}, nil
}

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

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
	}
}
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

		// Initialize as empty slice to guarantee [] instead of null
		orders := make([]models.Order, 0)

		err := app.DB.FindMany(
			ctx,
			ordersCollection,
			bson.M{"userId": userID},
			&orders,
		)
		if err != nil {
			log.Println("GetMyOrders FindMany error:", err)
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"orders": orders,
		})
	}
}
