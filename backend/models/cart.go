package models

import "time"

// CartItem represents a single item in the user's cart.
type CartItem struct {
	UserID     string    `json:"userId" bson:"userId"`
	Category   string    `json:"category" bson:"category"`
	ItemID     string    `json:"itemId" bson:"itemId"`
	ItemName   string    `json:"itemName" bson:"itemName"`
	ItemType   string    `json:"itemType,omitempty" bson:"itemType,omitempty"`
	Unit       string    `json:"unit,omitempty" bson:"unit,omitempty"`
	EntityID   string    `json:"entityId,omitempty" bson:"entityId,omitempty"`
	EntityName string    `json:"entityName,omitempty" bson:"entityName,omitempty"`
	EntityType string    `json:"entityType,omitempty" bson:"entityType,omitempty"`
	Quantity   int       `json:"quantity" bson:"quantity"`
	Price      float64   `json:"price,omitempty" bson:"price,omitempty"`
	AddedAt    time.Time `json:"addedAt" bson:"addedAt"`
}

// CheckoutSession represents a pre-order session, grouped by category.
type CheckoutSession struct {
	UserID         string                `json:"userId" bson:"userId"`
	Items          map[string][]CartItem `json:"items" bson:"items"`
	Address        string                `json:"address" bson:"address"`
	Total          float64               `json:"total" bson:"total"`
	Subtotal       float64               `json:"subtotal" bson:"subtotal"`
	Tax            float64               `json:"tax" bson:"tax"`
	Delivery       float64               `json:"delivery" bson:"delivery"`
	Discount       float64               `json:"discount" bson:"discount"`
	PaymentMethod  string                `json:"paymentMethod" bson:"paymentMethod"`
	PaymentDetails interface{}           `json:"paymentDetails" bson:"paymentDetails"`
	CreatedAt      time.Time             `json:"createdAt" bson:"createdAt"`
}

// Order represents a finalized order.
type Order struct {
	OrderID       string                `json:"orderId" bson:"orderId"`
	UserID        string                `json:"userId" bson:"userId"`
	Items         map[string][]CartItem `json:"items" bson:"items"` // grouped by category
	Address       string                `json:"address" bson:"address"`
	PaymentMethod string                `json:"paymentMethod" bson:"paymentMethod"`
	Total         float64               `json:"total" bson:"total"`
	Status        string                `json:"status" bson:"status"` // e.g. "pending", "completed"
	ApprovedBy    []string              `json:"approvedBy" bson:"approvedBy"`
	CreatedAt     time.Time             `json:"createdAt" bson:"createdAt"`
}
