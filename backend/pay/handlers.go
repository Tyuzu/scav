package pay

import (
	"encoding/json"
	"naevis/auditlog"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

func (p *PaymentService) GetBalance(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var acc models.Account
	if err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &acc); err != nil {
		http.Error(w, "account not found", http.StatusNotFound)
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"balance": acc.CachedBalance,
	})
}

func (p *PaymentService) TopUp(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var req struct {
		Amount int64  `json:"amount"`
		Method string `json:"method"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	ok, _ := p.lock(ctx, userID)
	if !ok {
		http.Error(w, "retry", http.StatusTooManyRequests)
		return
	}
	defer p.unlock(ctx, userID)

	accID, err := p.getOrCreateAccount(ctx, userID)
	if err != nil {
		http.Error(w, "account error", http.StatusInternalServerError)
		return
	}

	txnID := utils.GetUUID()
	now := time.Now()

	txn := models.Transaction{
		ID:          txnID,
		UserID:      userID,
		Type:        "topup",
		Method:      req.Method,
		Amount:      req.Amount,
		Currency:    "INR",
		FromAccount: "external",
		ToAccount:   accID,
		Status:      "initiated",
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := p.app.DB.InsertOne(ctx, transactionsCollection, txn); err != nil {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	j := models.JournalEntry{
		ID:            utils.GetUUID(),
		TxnID:         txnID,
		DebitAccount:  "external",
		CreditAccount: accID,
		Amount:        req.Amount,
		Currency:      "INR",
		CreatedAt:     now,
	}

	if err := p.app.DB.InsertOne(ctx, journalCollection, j); err != nil {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	// Record global ledger entry for money addition
	_ = p.recordGlobalLedger(ctx, txnID, j.ID, "addition", "topup", req.Amount, accID, userID)

	_ = p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": accID}, "cached_balance", req.Amount)

	_ = p.app.DB.UpdateOne(ctx, transactionsCollection,
		map[string]any{"_id": txnID},
		map[string]any{"$set": map[string]any{"status": "success", "updated_at": now}},
	)

	// Log audit trail for topup transaction
	auditlog.LogAction(
		ctx, p.app, r, userID,
		models.AuditActionTopUp,
		"transaction", txnID, "success",
		map[string]interface{}{
			"amount":  req.Amount,
			"method":  req.Method,
			"account": accID,
		},
	)

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
	})
}

func (p *PaymentService) Pay(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var req models.PayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Set default payment method if not provided
	if req.Method == "" {
		req.Method = "wallet"
	}

	// ────────── PAYMENT RULES ──────────
	rule, ok := PaymentRules[req.PaymentType]
	if !ok {
		http.Error(w, "invalid payment type", http.StatusBadRequest)
		return
	}

	if !rule.AllowedEntities[req.EntityType] {
		http.Error(w, "entity not allowed for payment type", http.StatusBadRequest)
		return
	}

	if !rule.AllowedMethods[req.Method] {
		http.Error(w, "payment method not allowed", http.StatusBadRequest)
		return
	}

	// ────────── PRICE RESOLUTION ──────────
	resolver, err := p.resolver(req.EntityType)
	if err != nil {
		http.Error(w, "unsupported entity", http.StatusBadRequest)
		return
	}

	price, err := resolver(ctx, req.EntityID)
	if err != nil {
		http.Error(w, "entity not found", http.StatusNotFound)
		return
	}

	// SECURITY: Handle custom amounts carefully
	if req.Amount > 0 {
		if !rule.AllowCustomAmt {
			http.Error(w, "custom amount not allowed", http.StatusBadRequest)
			return
		}

		// Only allow custom amounts for specific payment types (funding/donations)
		// not for purchases, orders, etc
		if req.PaymentType != "funding" && req.PaymentType != "donation" {
			http.Error(w, "custom amounts only allowed for donations", http.StatusBadRequest)
			return
		}

		// SECURITY: Set reasonable limits on custom amounts
		const maxCustomAmount = 1000000 // 10 lakh rupees max
		if req.Amount > maxCustomAmount {
			http.Error(w, "custom amount exceeds maximum limit", http.StatusBadRequest)
			return
		}

		if req.Amount < 0 {
			http.Error(w, "amount must be positive", http.StatusBadRequest)
			return
		}

		price = req.Amount
	}

	if price <= 0 {
		http.Error(w, "invalid amount", http.StatusBadRequest)
		return
	}

	// ────────── ACCOUNT RESOLUTION ──────────
	ok, _ = p.lock(ctx, userID)
	if !ok {
		http.Error(w, "retry", http.StatusTooManyRequests)
		return
	}
	defer p.unlock(ctx, userID)

	userAcc, err := p.getOrCreateAccount(ctx, userID)
	if err != nil {
		http.Error(w, "account error", http.StatusInternalServerError)
		return
	}

	var destinationAcc string
	if req.PaymentType == "funding" {
		destinationAcc, err = p.getOrCreateAccount(ctx, req.EntityID)
	} else {
		destinationAcc, err = p.getOrCreateAccount(ctx, "merchant")
	}
	if err != nil {
		http.Error(w, "destination account error", http.StatusInternalServerError)
		return
	}

	// ────────── PREVENT SELF-FUNDING ──────────
	if req.PaymentType == "funding" && userID == req.EntityID {
		http.Error(w, "self funding not allowed", http.StatusForbidden)
		return
	}

	// ────────── BALANCE CHECK (WALLET ONLY) ──────────
	if req.Method == "wallet" {
		var acc models.Account
		if err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"_id": userAcc}, &acc); err != nil {
			http.Error(w, "account error", http.StatusInternalServerError)
			return
		}

		if acc.CachedBalance < price {
			utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
				"success": false,
				"message": "insufficient balance",
			})
			return
		}
	}

	// ────────── TRANSACTION + LEDGER ──────────
	txnID := utils.GetUUID()
	now := time.Now()

	txn := models.Transaction{
		ID:          txnID,
		UserID:      userID,
		Type:        "payment",
		Method:      req.Method,
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		FromAccount: userAcc,
		ToAccount:   destinationAcc,
		Amount:      price,
		Currency:    "INR",
		Status:      "initiated",
		CreatedAt:   now,
		UpdatedAt:   now,
		Meta:        models.Meta{"payment_type": req.PaymentType},
	}

	if err := p.app.DB.InsertOne(ctx, transactionsCollection, txn); err != nil {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	j := models.JournalEntry{
		ID:            utils.GetUUID(),
		TxnID:         txnID,
		DebitAccount:  userAcc,
		CreditAccount: destinationAcc,
		Amount:        price,
		Currency:      "INR",
		CreatedAt:     now,
	}

	if err := p.app.DB.InsertOne(ctx, journalCollection, j); err != nil {
		p.failTxn(ctx, txnID)
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	// ────────── BALANCE UPDATES ──────────
	if req.Method == "wallet" {
		if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": userAcc}, "cached_balance", -price); err != nil {
			p.failTxn(ctx, txnID)
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}

		if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": destinationAcc}, "cached_balance", price); err != nil {
			p.failTxn(ctx, txnID)
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
	}

	p.successTxn(ctx, txnID)

	// Log audit trail for payment transaction
	auditlog.LogAction(
		ctx, p.app, r, userID,
		models.AuditActionPayment,
		"transaction", txnID, "success",
		map[string]interface{}{
			"amount":       price,
			"method":       req.Method,
			"entity_type":  req.EntityType,
			"entity_id":    req.EntityID,
			"payment_type": req.PaymentType,
		},
	)

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": txnID,
	})
}
