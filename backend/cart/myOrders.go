package cart

import (
	"context"
	"log"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

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

		// Parse pagination parameters
		skip := 0
		limit := 10
		if s := r.URL.Query().Get("skip"); s != "" {
			if parsed, err := strconv.Atoi(s); err == nil && parsed >= 0 {
				skip = parsed
			}
		}
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}

		// Fetch regular orders
		regularOrders := make([]models.Order, 0)
		err := app.DB.FindMany(
			ctx,
			ordersCollection,
			bson.M{"userId": userID},
			&regularOrders,
		)
		if err != nil {
			log.Println("GetMyOrders FindMany error:", err)
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		// Fetch farm orders
		farmOrders := make([]models.FarmOrder, 0)
		err = app.DB.FindMany(
			ctx,
			farmOrdersCollection,
			bson.M{"userid": userID},
			&farmOrders,
		)
		if err != nil {
			log.Println("GetMyOrders farm orders error:", err)
			// Don't fail on farm orders error, just proceed with regular orders
		}

		// Combine and consolidate all orders by creation date
		type CombinedOrder struct {
			OrderID       string                       `bson:"orderId" json:"orderId"`
			OrderType     string                       `json:"orderType"` // "regular" or "farm"
			UserID        string                       `bson:"userId" json:"userId"`
			FarmID        string                       `json:"farmId,omitempty"`
			Items         map[string][]models.CartItem `bson:"items" json:"items,omitempty"`
			Address       string                       `bson:"address" json:"address,omitempty"`
			PaymentMethod string                       `bson:"paymentMethod" json:"paymentMethod,omitempty"`
			Total         int64                        `bson:"total" json:"total"` // In paise
			Status        string                       `bson:"status" json:"status"`
			CreatedAt     time.Time                    `bson:"createdAt" json:"createdAt"`
			ApprovedBy    []string                     `bson:"approvedBy" json:"approvedBy,omitempty"`
		}

		var allOrders []CombinedOrder

		// Add regular orders
		for _, order := range regularOrders {
			allOrders = append(allOrders, CombinedOrder{
				OrderID:       order.OrderID,
				OrderType:     "regular",
				UserID:        order.UserID,
				Items:         order.Items,
				Address:       order.Address,
				PaymentMethod: order.PaymentMethod,
				Total:         order.Total,
				Status:        order.Status,
				CreatedAt:     order.CreatedAt,
				ApprovedBy:    order.ApprovedBy,
			})
		}

		// Add farm orders (convert priceAtPurchase to paise)
		for _, order := range farmOrders {
			allOrders = append(allOrders, CombinedOrder{
				OrderID:    order.OrderID,
				OrderType:  "farm",
				UserID:     order.UserID,
				FarmID:     order.FarmID,
				Items:      order.Items,
				Total:      int64(order.PriceAtPurchase * 100), // Convert rupees to paise
				Status:     string(order.Status),
				CreatedAt:  order.CreatedAt,
				ApprovedBy: order.ApprovedBy,
			})
		}

		// Sort by creation date (newest first)
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].CreatedAt.After(allOrders[j].CreatedAt)
		})

		// Apply pagination on combined results
		total := len(allOrders)
		start := skip
		end := skip + limit
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}

		paginatedOrders := allOrders[start:end]

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"orders": paginatedOrders,
			"total":  total,
			"skip":   skip,
			"limit":  limit,
		})
	}
}
