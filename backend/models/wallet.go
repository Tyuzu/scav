package models

import "time"

// Meta is a generic key-value map for transaction metadata
// Keep this flexible, but never put money here.
type Meta map[string]interface{}

// =====================
// MONEY & TRANSACTIONS
// =====================

// Transaction represents a wallet or payment transaction.
// Amount is ALWAYS stored in the smallest currency unit (e.g. paise).
type Transaction struct {
	ID        string `bson:"_id,omitempty" json:"id"`
	UserID    string `bson:"userid,omitempty" json:"userid,omitempty"` // owner (viewer) of this txn
	ParentTxn string `bson:"parent_txn,omitempty" json:"parent_txn,omitempty"`

	Type string `bson:"type" json:"type"`
	// allowed:
	// topup, payment, transfer, refund
	// debit, credit (derived / per-user views)

	Method string `bson:"method" json:"method"`
	// wallet, card, upi, cod, transfer, refund

	EntityType string `bson:"entity_type,omitempty" json:"entity_type,omitempty"`
	EntityID   string `bson:"entity_id,omitempty" json:"entity_id,omitempty"`

	FromAccount string `bson:"from_account,omitempty" json:"from_account,omitempty"`
	ToAccount   string `bson:"to_account,omitempty" json:"to_account,omitempty"`

	Amount   int64  `bson:"amount" json:"amount"` // SMALLEST UNIT (paise)
	Currency string `bson:"currency" json:"currency"`

	Status string `bson:"state" json:"state"`
	// initiated, success, failed, reversed

	IdempotencyKey string `bson:"external_ref,omitempty" json:"external_ref,omitempty"`

	Meta Meta `bson:"meta,omitempty" json:"meta,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// =====================
// LEDGER (SOURCE OF TRUTH)
// =====================

// JournalEntry represents a double-entry ledger record.
// This is the real source of truth for money movement.
type JournalEntry struct {
	ID            string `bson:"_id,omitempty" json:"id"`
	TxnID         string `bson:"txn_id" json:"txn_id"`
	DebitAccount  string `bson:"debit_account" json:"debit_account"`
	CreditAccount string `bson:"credit_account" json:"credit_account"`

	Amount   int64  `bson:"amount" json:"amount"` // SMALLEST UNIT
	Currency string `bson:"currency" json:"currency"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	Meta      Meta      `bson:"meta,omitempty" json:"meta,omitempty"`
}

// =====================
// ACCOUNTS
// =====================

// Account represents a wallet account.
// CachedBalance is a PERFORMANCE CACHE, not a source of truth.
type Account struct {
	ID       string `bson:"_id,omitempty" json:"id"`
	UserID   string `bson:"userid" json:"userid"`
	Currency string `bson:"currency" json:"currency"`

	Status string `bson:"status" json:"status"`
	// active, frozen, closed

	CachedBalance int64 `bson:"cached_balance" json:"cached_balance"` // SMALLEST UNIT

	Version int `bson:"version" json:"version"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// =====================
// PAYMENTS
// =====================

// PayRequest is the request payload for /wallet/pay
// Amount is optional and ONLY used when entity allows custom pricing.
type PayRequest struct {
	PaymentType string `json:"paymentType"` // funding | purchase

	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`

	Method string `json:"method"` // wallet, card, upi, cod

	Amount int64 `json:"amount,omitempty"` // SMALLEST UNIT
}

// =====================
// IDEMPOTENCY
// =====================

// IdempotencyRecord stores cached responses for safe retries.
type IdempotencyRecord struct {
	Key         string `bson:"key" json:"key"`
	Method      string `bson:"method" json:"method"`
	Path        string `bson:"path" json:"path"`
	UserID      string `bson:"userid" json:"userid"`
	RequestHash string `bson:"request_hash" json:"request_hash"`

	Response map[string]interface{} `bson:"response,omitempty" json:"response,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	ExpiresAt time.Time `bson:"expires_at" json:"expires_at"`
}
