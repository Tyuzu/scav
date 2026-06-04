package farms

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func GetFarmDash(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			utils.RespondWithJSON(w, http.StatusBadRequest, utils.M{
				"success": false,
				"message": "Invalid user",
			})
			return
		}

		var farm models.Farm
		if err := app.DB.FindOne(
			ctx,
			farmsCollection,
			bson.M{"createdBy": userID},
			&farm,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, utils.M{
				"success": false,
				"message": "Farm not found",
			})
			return
		}

		var crops []models.Crop
		if err := app.DB.FindMany(
			ctx,
			cropsCollection,
			bson.M{"farmid": farm.FarmID},
			&crops,
		); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, utils.M{
				"success": false,
				"message": "Failed to load crops",
			})
			return
		}

		var orders []models.FarmOrder
		_ = app.DB.FindMany(
			ctx,
			farmOrdersCollection,
			bson.M{"farmid": farm.FarmID},
			&orders,
		)

		for i := range crops {
			crops[i].FarmName = farm.Name
		}

		farm.Crops = crops

		// ==================================================
		// INVENTORY
		// ==================================================

		var totalQuantity int
		var inventoryValue float64
		var featuredCount int
		var lowStockCount int
		var outOfStockCount int

		categories := make(map[string]int)

		type TopCrop struct {
			Name     string  `json:"name"`
			Quantity int     `json:"quantity"`
			Unit     string  `json:"unit"`
			Value    float64 `json:"value"`
		}

		var topCrops []TopCrop

		for _, crop := range crops {

			totalQuantity += crop.Quantity

			value :=
				float64(crop.Quantity) *
					crop.Price

			inventoryValue += value

			if crop.Featured {
				featuredCount++
			}

			if crop.Category != "" {
				categories[crop.Category]++
			}

			if crop.OutOfStock || crop.Quantity <= 0 {
				outOfStockCount++
			} else if crop.Quantity <= 10 {
				lowStockCount++
			}

			topCrops = append(topCrops, TopCrop{
				Name:     crop.Name,
				Quantity: crop.Quantity,
				Unit:     crop.Unit,
				Value:    value,
			})
		}

		sort.Slice(topCrops, func(i, j int) bool {
			return topCrops[i].Value > topCrops[j].Value
		})

		if len(topCrops) > 5 {
			topCrops = topCrops[:5]
		}

		// ==================================================
		// ORDERS
		// ==================================================

		var pendingOrders int
		var deliveredOrders int
		var cancelledOrders int

		var monthlyRevenue float64
		var lifetimeRevenue float64

		var todayOrders int

		customerSet := map[string]struct{}{}

		type RecentOrder struct {
			OrderID string    `json:"orderId"`
			Status  string    `json:"status"`
			Total   float64   `json:"total"`
			Date    time.Time `json:"date"`
		}

		var recentOrders []RecentOrder

		now := time.Now()
		monthStart := time.Date(
			now.Year(),
			now.Month(),
			1,
			0,
			0,
			0,
			0,
			now.Location(),
		)

		for _, order := range orders {

			customerSet[order.UserID] = struct{}{}

			status := strings.ToLower(string(order.Status))

			switch status {

			case "pending":
				pendingOrders++

			case "delivered", "closed":
				deliveredOrders++

				revenue := float64(order.Total) / 100

				lifetimeRevenue += revenue

				if order.CreatedAt.After(monthStart) {
					monthlyRevenue += revenue
				}

			case "cancelled", "rejected":
				cancelledOrders++
			}

			if sameDay(order.CreatedAt, now) {
				todayOrders++
			}

			recentOrders = append(recentOrders, RecentOrder{
				OrderID: order.OrderID,
				Status:  status,
				Total:   float64(order.Total) / 100,
				Date:    order.CreatedAt,
			})
		}

		sort.Slice(recentOrders, func(i, j int) bool {
			return recentOrders[i].Date.After(recentOrders[j].Date)
		})

		if len(recentOrders) > 10 {
			recentOrders = recentOrders[:10]
		}

		// ==================================================
		// ALERTS
		// ==================================================

		type Alert struct {
			Type     string `json:"type"`
			Severity string `json:"severity"`
			Message  string `json:"message"`
		}

		var alerts []Alert

		for _, crop := range crops {

			if crop.Quantity <= 0 {

				alerts = append(alerts, Alert{
					Type:     "inventory",
					Severity: "critical",
					Message:  crop.Name + " is out of stock",
				})

			} else if crop.Quantity <= 10 {

				alerts = append(alerts, Alert{
					Type:     "inventory",
					Severity: "warning",
					Message: crop.Name +
						" stock is running low",
				})
			}
		}

		if pendingOrders >= 5 {
			alerts = append(alerts, Alert{
				Type:     "orders",
				Severity: "warning",
				Message:  "You have multiple pending orders awaiting action",
			})
		}

		// ==================================================
		// RECOMMENDATIONS
		// ==================================================

		var recommendations []string

		if outOfStockCount > 0 {
			recommendations = append(
				recommendations,
				"Restock crops that are currently unavailable",
			)
		}

		if lowStockCount > 0 {
			recommendations = append(
				recommendations,
				"Prepare harvests for low inventory crops",
			)
		}

		if featuredCount == 0 && len(crops) > 0 {
			recommendations = append(
				recommendations,
				"Feature at least one crop to improve visibility",
			)
		}

		if pendingOrders > deliveredOrders {
			recommendations = append(
				recommendations,
				"Review and fulfill pending orders",
			)
		}

		// ==================================================
		// HEALTH SCORE
		// ==================================================

		healthScore := 100

		healthScore -= outOfStockCount * 10
		healthScore -= lowStockCount * 5

		if healthScore < 0 {
			healthScore = 0
		}

		utils.RespondWithJSON(w, http.StatusOK, utils.M{
			"success": true,
			"farm":    farm,

			"dashboard": utils.M{

				"stats": utils.M{
					"healthScore": healthScore,
				},

				"inventory": utils.M{
					"totalCrops":      len(crops),
					"totalQuantity":   totalQuantity,
					"inventoryValue":  inventoryValue,
					"featuredCrops":   featuredCount,
					"lowStockCount":   lowStockCount,
					"outOfStockCount": outOfStockCount,
					"categories":      categories,
				},

				"orders": utils.M{
					"total":     len(orders),
					"today":     todayOrders,
					"pending":   pendingOrders,
					"delivered": deliveredOrders,
					"cancelled": cancelledOrders,
					"customers": len(customerSet),
				},

				"revenue": utils.M{
					"monthly":  monthlyRevenue,
					"lifetime": lifetimeRevenue,
				},

				"topCrops":        topCrops,
				"alerts":          alerts,
				"recommendations": recommendations,
				"recentOrders":    recentOrders,
			},
		})
	}
}

func sameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()

	return ay == by &&
		am == bm &&
		ad == bd
}
