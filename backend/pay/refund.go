package pay

import (
	"encoding/json"
	"net/http"
	"time"

	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

func (p *PaymentService) Refund(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var req struct {
		TransactionID string `json:"transaction_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TransactionID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request")
		return
	}

	var orig models.Transaction
	if err := p.app.DB.FindOne(
		ctx,
		transactionsCollection,
		map[string]any{"_id": req.TransactionID},
		&orig,
	); err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "not found")
		return
	}

	// Verify user owns the transaction
	if orig.UserID != "" && orig.UserID != userID {
		utils.RespondWithError(w, http.StatusForbidden, "unauthorized")
		return
	}

	if orig.Status != "success" {
		utils.RespondWithError(w, http.StatusBadRequest, "not refundable")
		return
	}

	fromAcc := orig.ToAccount
	toAcc := orig.FromAccount

	// Consistent lock ordering prevents deadlocks
	lockA := fromAcc
	lockB := toAcc

	if lockB < lockA {
		lockA, lockB = lockB, lockA
	}

	// ────────── REDIS LOCKS ──────────

	lockKeyA := "refund_lock:" + lockA
	lockTokenA := utils.GetUUID()

	locked, err := p.app.Cache.SetNX(
		ctx,
		lockKeyA,
		[]byte(lockTokenA),
		30*time.Second,
	)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}

	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}

	defer func() {
		_ = p.app.Cache.Del(ctx, lockKeyA)
	}()

	lockKeyB := "refund_lock:" + lockB
	lockTokenB := utils.GetUUID()

	locked, err = p.app.Cache.SetNX(
		ctx,
		lockKeyB,
		[]byte(lockTokenB),
		30*time.Second,
	)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}

	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}

	defer func() {
		_ = p.app.Cache.Del(ctx, lockKeyB)
	}()

	// ────────── REFUND TRANSACTION ──────────

	txnID := utils.GetUUID()
	now := time.Now()

	refund := models.Transaction{
		ID:          txnID,
		UserID:      orig.UserID,
		Type:        "refund",
		Method:      "wallet",
		FromAccount: fromAcc,
		ToAccount:   toAcc,
		Amount:      orig.Amount,
		Currency:    orig.Currency,
		Status:      "initiated",
		CreatedAt:   now,
		UpdatedAt:   now,
		Meta:        models.Meta{"original_txn": orig.ID},
	}

	if err := p.app.DB.InsertOne(ctx, transactionsCollection, refund); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	j := models.JournalEntry{
		ID:            utils.GetUUID(),
		TxnID:         txnID,
		DebitAccount:  fromAcc,
		CreditAccount: toAcc,
		Amount:        refund.Amount,
		Currency:      refund.Currency,
		CreatedAt:     now,
	}

	if err := p.app.DB.InsertOne(ctx, journalCollection, j); err != nil {
		p.failTxn(ctx, txnID)
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	if err := p.app.DB.Inc(
		ctx,
		accountsCollection,
		map[string]any{"_id": fromAcc},
		"cached_balance",
		-refund.Amount,
	); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	if err := p.app.DB.Inc(
		ctx,
		accountsCollection,
		map[string]any{"_id": toAcc},
		"cached_balance",
		refund.Amount,
	); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	p.successTxn(ctx, txnID)

	// mark original reversed (best-effort)
	_ = p.app.DB.UpdateOne(
		ctx,
		transactionsCollection,
		map[string]any{"_id": orig.ID},
		map[string]any{
			"$set": map[string]any{
				"status":     "reversed",
				"updated_at": now,
			},
		},
	)

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": txnID,
	})
}
