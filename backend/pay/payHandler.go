package pay

import (
	"encoding/json"
	"net/http"
	"time"

	"naevis/auditlog"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func (p *PaymentService) Pay(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var req models.PayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		auditlog.LogAction(
			ctx, p.app, r, userID,
			models.AuditActionPayment,
			"payment_error", "json_decode", "failed",
			map[string]interface{}{
				"error":        err.Error(),
				"content_type": r.Header.Get("Content-Type"),
			},
		)
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}

	// Set default payment method if not provided
	if req.Method == "" {
		req.Method = "wallet"
	}

	// Validate required fields
	if req.PaymentType == "" || req.EntityType == "" || req.EntityID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "missing required fields: paymentType, entityType, or entityId")
		return
	}

	// ────────── PAYMENT RULES ──────────
	rule, ok := PaymentRules[req.PaymentType]
	if !ok {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid payment type")
		return
	}

	if !rule.AllowedEntities[req.EntityType] {
		utils.RespondWithError(w, http.StatusBadRequest, "entity not allowed for payment type")
		return
	}

	if !rule.AllowedMethods[req.Method] {
		utils.RespondWithError(w, http.StatusBadRequest, "payment method not allowed")
		return
	}

	// ────────── PRICE RESOLUTION ──────────
	resolver, err := p.resolver(req.EntityType)
	if err != nil {
		auditlog.LogAction(
			ctx, p.app, r, userID,
			models.AuditActionPayment,
			"payment_error", "resolver_failed", "failed",
			map[string]interface{}{
				"entity_type": req.EntityType,
				"error":       err.Error(),
			},
		)
		utils.RespondWithError(w, http.StatusBadRequest, "unsupported entity")
		return
	}

	price, err := resolver(ctx, req.EntityID)
	if err != nil {
		auditlog.LogAction(
			ctx, p.app, r, userID,
			models.AuditActionPayment,
			"payment_error", "entity_not_found", "failed",
			map[string]interface{}{
				"entity_type": req.EntityType,
				"entity_id":   req.EntityID,
				"error":       err.Error(),
			},
		)
		utils.RespondWithError(w, http.StatusNotFound, "entity not found: "+req.EntityType+" ("+req.EntityID+")")
		return
	}

	// SECURITY: Handle custom amounts carefully
	if req.Amount > 0 {
		if !rule.AllowCustomAmt {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amount not allowed")
			return
		}

		// Only allow custom amounts for specific payment types (funding/donations)
		// not for purchases, orders, etc
		if req.PaymentType != "funding" && req.PaymentType != "donation" {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amounts only allowed for donations")
			return
		}

		// SECURITY: Set reasonable limits on custom amounts
		const maxCustomAmount = 1000000 // 10 lakh rupees max
		if req.Amount > maxCustomAmount {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amount exceeds maximum limit")
			return
		}

		price = req.Amount
	}

	if price <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid amount")
		return
	}

	// ────────── REDIS LOCK ──────────
	lockKey := "payment_lock:" + userID
	lockToken := utils.GetUUID()

	locked, err := p.app.Cache.SetNX(ctx, lockKey, []byte(lockToken), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}

	defer func() {
		_ = p.app.Cache.Del(ctx, lockKey)
	}()

	// ────────── ACCOUNT RESOLUTION ──────────
	userAcc, err := p.getOrCreateAccount(ctx, userID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}

	// ────────── PREVENT SELF-FUNDING ──────────
	if req.PaymentType == "funding" && userID == req.EntityID {
		utils.RespondWithError(w, http.StatusForbidden, "self funding not allowed")
		return
	}

	var destinationAcc string
	if req.PaymentType == "funding" {
		destinationAcc, err = p.getOrCreateAccount(ctx, req.EntityID)
	} else {
		destinationAcc, err = p.getOrCreateAccount(ctx, "merchant")
	}
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "destination account error")
		return
	}

	// ────────── BALANCE CHECK (WALLET ONLY) ──────────
	if req.Method == "wallet" {
		var acc models.Account
		if err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"_id": userAcc}, &acc); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "account error")
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
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	// ────────── BALANCE UPDATES ──────────
	if req.Method == "wallet" {
		if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": userAcc}, "cached_balance", -price); err != nil {
			p.failTxn(ctx, txnID)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed")
			return
		}

		if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": destinationAcc}, "cached_balance", price); err != nil {
			p.failTxn(ctx, txnID)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed")
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
