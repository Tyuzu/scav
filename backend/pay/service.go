package pay

import (
	"context"
	"errors"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

// ===== Price Resolver =====

type PriceResolver func(ctx context.Context, entityID string) (int64, error)

// ===== Payment Service =====

type PaymentService struct {
	app       *infra.Deps
	resolvers map[string]PriceResolver
}

// Constructor
func NewPaymentService(app *infra.Deps) *PaymentService {
	return &PaymentService{
		app:       app,
		resolvers: make(map[string]PriceResolver),
	}
}

// Register resolver
func (p *PaymentService) RegisterResolver(entityType string, r PriceResolver) {
	p.resolvers[entityType] = r
}

func (p *PaymentService) resolver(entityType string) (PriceResolver, error) {
	r, ok := p.resolvers[entityType]
	if !ok {
		return nil, errors.New("unsupported entity type")
	}
	return r, nil
}

// ===== Default Resolvers =====

func (p *PaymentService) RegisterDefaultResolvers() {
	db := p.app.DB

	p.RegisterResolver("ticket", func(ctx context.Context, id string) (int64, error) {
		var t struct{ Price int64 }
		err := db.FindOne(ctx, "tickets", map[string]any{"ticketid": id}, &t)
		return t.Price, err
	})

	p.RegisterResolver("menu", func(ctx context.Context, id string) (int64, error) {
		var m struct{ Price int64 }
		err := db.FindOne(ctx, "menu", map[string]any{"menuid": id}, &m)
		return m.Price, err
	})

	p.RegisterResolver("service", func(ctx context.Context, id string) (int64, error) {
		var s struct{ Price int64 }
		err := db.FindOne(ctx, "services", map[string]any{"serviceid": id}, &s)
		return s.Price, err
	})

	// donations / tips
	p.RegisterResolver("post", func(ctx context.Context, id string) (int64, error) {
		return 0, nil
	})

	// orders - fetch total from order
	p.RegisterResolver("order", func(ctx context.Context, id string) (int64, error) {
		var o struct{ Total int64 }
		err := db.FindOne(ctx, "orders", map[string]any{"orderId": id}, &o)
		return o.Total, err
	})

	// cart - custom entity, no fixed price
	p.RegisterResolver("cart", func(ctx context.Context, id string) (int64, error) {
		return 0, nil
	})

	// product - treat like menu item
	p.RegisterResolver("product", func(ctx context.Context, id string) (int64, error) {
		var p struct{ Price int64 }
		err := db.FindOne(ctx, "products", map[string]any{"productid": id}, &p)
		return p.Price, err
	})

	// booking - has a price
	p.RegisterResolver("booking", func(ctx context.Context, id string) (int64, error) {
		var b struct{ Price int64 }
		err := db.FindOne(ctx, "bookings", map[string]any{"bookingid": id}, &b)
		return b.Price, err
	})

	// merch - has a price
	p.RegisterResolver("merch", func(ctx context.Context, id string) (int64, error) {
		var m struct{ Price int64 }
		err := db.FindOne(ctx, "merch", map[string]any{"merchid": id}, &m)
		return m.Price, err
	})

	// crop - has a price
	p.RegisterResolver("crop", func(ctx context.Context, id string) (int64, error) {
		var c struct{ Price int64 }
		err := db.FindOne(ctx, "crops", map[string]any{"cropid": id}, &c)
		return c.Price, err
	})

	// farm - custom entity
	p.RegisterResolver("farm", func(ctx context.Context, id string) (int64, error) {
		return 0, nil
	})

	// beat - has a price
	p.RegisterResolver("beat", func(ctx context.Context, id string) (int64, error) {
		var b struct{ Price int64 }
		err := db.FindOne(ctx, "beats", map[string]any{"beatid": id}, &b)
		return b.Price, err
	})

	// donation - custom amount
	p.RegisterResolver("donation", func(ctx context.Context, id string) (int64, error) {
		return 0, nil
	})

	// funding - custom amount
	p.RegisterResolver("funding", func(ctx context.Context, id string) (int64, error) {
		return 0, nil
	})
}

// ===== Account Helpers =====

func (p *PaymentService) getOrCreateAccount(ctx context.Context, userID string) (string, error) {
	var acc models.Account
	err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &acc)
	if err == nil {
		return acc.ID, nil
	}

	newAcc := models.Account{
		ID:            utils.GetUUID(),
		UserID:        userID,
		Currency:      "INR",
		Status:        "active",
		CachedBalance: 0,
		Version:       1,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := p.app.DB.InsertOne(ctx, accountsCollection, newAcc); err != nil {
		// race: retry read
		err = p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &acc)
		return acc.ID, err
	}

	return newAcc.ID, nil
}

// ===== Redis Lock =====

const walletLockTTL = 5 * time.Second

func (p *PaymentService) lock(ctx context.Context, key string) (bool, error) {
	return p.app.Cache.SetNX(ctx, "wallet_lock:"+key, []byte("1"), walletLockTTL)
}

func (p *PaymentService) unlock(ctx context.Context, key string) {
	_ = p.app.Cache.Del(ctx, "wallet_lock:"+key)
}

// HELPERS

func (p *PaymentService) failTxn(ctx context.Context, txnID string) {
	_ = p.app.DB.UpdateOne(ctx, transactionsCollection,
		map[string]any{"_id": txnID},
		map[string]any{"$set": map[string]any{"status": "failed", "updated_at": time.Now()}},
	)
}

func (p *PaymentService) successTxn(ctx context.Context, txnID string) {
	_ = p.app.DB.UpdateOne(ctx, transactionsCollection,
		map[string]any{"_id": txnID},
		map[string]any{"$set": map[string]any{"status": "success", "updated_at": time.Now()}},
	)
}

// recordGlobalLedger records money additions/deletions in the global ledger
// type: "addition" (topup/refund) or "deletion" (payment/withdrawal)
// reason: topup, refund, payment, transfer, etc
func (p *PaymentService) recordGlobalLedger(ctx context.Context, txnID string, journalEntryID string, ledgerType string, reason string, amount int64, accountID string, userID string) error {
	// Get previous running totals (simplified: we'll just get any entry and use its totals)
	// In production, you might want to query the latest or maintain a summary document
	var lastEntry models.GlobalLedger

	totalAdditions := int64(0)
	totalDeletions := int64(0)

	// Try to find the last entry - if none exists, start from 0
	// Note: In a production system, you'd want to query the latest by timestamp or use aggregation
	_ = p.app.DB.FindOne(ctx, globalLedgerCollection, map[string]any{}, &lastEntry)

	// If we found a previous entry, use its running totals as baseline
	if lastEntry.ID != "" {
		totalAdditions = lastEntry.TotalAdditionsUpto
		totalDeletions = lastEntry.TotalDeletionsUpto
	}

	// Update running totals based on entry type
	switch ledgerType {
	case "addition":
		totalAdditions += amount
	case "deletion":
		totalDeletions += amount
	}

	entry := models.GlobalLedger{
		ID:                 utils.GetUUID(),
		TxnID:              txnID,
		Type:               ledgerType,
		Reason:             reason,
		Amount:             amount,
		Currency:           "INR",
		AccountID:          accountID,
		UserID:             userID,
		JournalEntryID:     journalEntryID,
		TotalAdditionsUpto: totalAdditions,
		TotalDeletionsUpto: totalDeletions,
		NetBalanceUpto:     totalAdditions - totalDeletions,
		CreatedAt:          time.Now(),
	}

	return p.app.DB.InsertOne(ctx, globalLedgerCollection, entry)
}

// ===== Payment Rules =====

type PaymentRule struct {
	AllowedEntities map[string]bool
	AllowedMethods  map[string]bool
	AllowCustomAmt  bool
}

var PaymentRules = map[string]PaymentRule{
	"funding": {
		AllowedEntities: map[string]bool{"artist": true},
		AllowedMethods:  map[string]bool{"card": true},
		AllowCustomAmt:  true,
	},
	"purchase": {
		AllowedEntities: map[string]bool{
			"order":    true,
			"cart":     true,
			"menu":     true,
			"booking":  true,
			"product":  true,
			"ticket":   true,
			"merch":    true,
			"crop":     true,
			"service":  true,
			"farm":     true,
			"beat":     true,
			"donation": true,
			"funding":  true,
		},
		AllowedMethods: map[string]bool{
			"wallet": true,
			"card":   true,
			"cod":    true,
		},
		AllowCustomAmt: false,
	},
}
