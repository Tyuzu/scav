package models

import "time"

type DashboardResponse struct {
	Stats           DashboardStats    `json:"stats"`
	Inventory       InventoryMetrics  `json:"inventory"`
	Orders          OrderMetrics      `json:"orders"`
	Revenue         RevenueMetrics    `json:"revenue"`
	Harvests        HarvestMetrics    `json:"harvests"`
	Customers       CustomerMetrics   `json:"customers"`
	Alerts          []Alert           `json:"alerts"`
	Recommendations []string          `json:"recommendations"`
	TopCrops        []CropPerformance `json:"topCrops"`
	ActivityFeed    []ActivityItem    `json:"activityFeed"`
}

type DashboardStats struct {
	HealthScore int `json:"healthScore"`
}

type InventoryMetrics struct {
	TotalCrops      int     `json:"totalCrops"`
	TotalQuantity   int64   `json:"totalQuantity"`
	InventoryValue  float64 `json:"inventoryValue"`
	FeaturedCrops   int     `json:"featuredCrops"`
	LowStockCount   int     `json:"lowStockCount"`
	OutOfStockCount int     `json:"outOfStockCount"`
}

type OrderMetrics struct {
	PendingOrders   int `json:"pendingOrders"`
	CompletedOrders int `json:"completedOrders"`
	CancelledOrders int `json:"cancelledOrders"`
	TodayDeliveries int `json:"todayDeliveries"`
}

type RevenueMetrics struct {
	TodayRevenue    float64 `json:"todayRevenue"`
	WeeklyRevenue   float64 `json:"weeklyRevenue"`
	MonthlyRevenue  float64 `json:"monthlyRevenue"`
	LifetimeRevenue float64 `json:"lifetimeRevenue"`
}

type HarvestMetrics struct {
	ReadyNow        int `json:"readyNow"`
	Next7Days       int `json:"next7Days"`
	DelayedHarvests int `json:"delayedHarvests"`
}

type CustomerMetrics struct {
	UniqueCustomers int `json:"uniqueCustomers"`
	RepeatCustomers int `json:"repeatCustomers"`
}

type Alert struct {
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type CropPerformance struct {
	Name     string  `json:"name"`
	Quantity int64   `json:"quantity"`
	Value    float64 `json:"value"`
	Revenue  float64 `json:"revenue"`
}

type ActivityItem struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}
