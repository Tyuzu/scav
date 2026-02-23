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
			"menu":    true,
			"ticket":  true,
			"service": true,
		},
		AllowedMethods: map[string]bool{
			"wallet": true,
			"card":   true,
			"cod":    true,
		},
		AllowCustomAmt: false,
	},
}
