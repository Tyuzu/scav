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

		if item.ItemID == "" || item.ItemName == "" || item.Category == "" || item.Quantity <= 0 {
			http.Error(w, "Missing or invalid fields", http.StatusBadRequest)
			return
		}

		item.UserID = userID

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
		_, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var session models.CheckoutSession
		if err := json.NewDecoder(r.Body).Decode(&session); err != nil {
			log.Println("CreateCheckoutSession decode error:", err)
			http.Error(w, "Invalid session data", http.StatusBadRequest)
			return
		}

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		session.UserID = userID
		session.CreatedAt = time.Now()

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
