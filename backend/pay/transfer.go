package pay

import (
	"encoding/json"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

func (p *PaymentService) Transfer(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	senderID := utils.GetUserIDFromRequest(r)

	var req struct {
		Recipient string `json:"recipient"`
		Amount    int64  `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 || req.Recipient == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request")
		return
	}

	senderAcc, err := p.getOrCreateAccount(ctx, senderID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}
	recipientAcc, err := p.getOrCreateAccount(ctx, req.Recipient)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "recipient error")
		return
	}

	// deterministic lock ordering
	lockA, lockB := senderAcc, recipientAcc
	if lockB < lockA {
		lockA, lockB = lockB, lockA
	}

	ok, _ := p.lock(ctx, lockA)
	if !ok {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer p.unlock(ctx, lockA)

	ok, _ = p.lock(ctx, lockB)
	if !ok {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer p.unlock(ctx, lockB)

	var sender models.Account
	if err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"_id": senderAcc}, &sender); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}

	if sender.CachedBalance < req.Amount {
		utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"message": "insufficient balance",
		})
		return
	}

	txnID := utils.GetUUID()
	now := time.Now()

	master := models.Transaction{
		ID:          txnID,
		Type:        "transfer",
		Method:      "wallet",
		FromAccount: senderAcc,
		ToAccount:   recipientAcc,
		Amount:      req.Amount,
		Currency:    "INR",
		Status:      "initiated",
		CreatedAt:   now,
		UpdatedAt:   now,
		Meta:        models.Meta{"note": "user transfer"},
	}

	if err := p.app.DB.InsertOne(ctx, transactionsCollection, master); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	j := models.JournalEntry{
		ID:            utils.GetUUID(),
		TxnID:         txnID,
		DebitAccount:  senderAcc,
		CreditAccount: recipientAcc,
		Amount:        req.Amount,
		Currency:      "INR",
		CreatedAt:     now,
	}

	if err := p.app.DB.InsertOne(ctx, journalCollection, j); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": senderAcc}, "cached_balance", -req.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	if err := p.app.DB.Inc(ctx, accountsCollection, map[string]any{"_id": recipientAcc}, "cached_balance", req.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	// derived per-user views (best-effort)
	_ = p.app.DB.InsertMany(ctx, transactionsCollection, []interface{}{
		models.Transaction{
			ID:        utils.GetUUID(),
			ParentTxn: txnID,
			UserID:    senderID,
			Type:      "debit",
			Amount:    req.Amount,
			Status:    "success",
			CreatedAt: now,
		},
		models.Transaction{
			ID:        utils.GetUUID(),
			ParentTxn: txnID,
			UserID:    req.Recipient,
			Type:      "credit",
			Amount:    req.Amount,
			Status:    "success",
			CreatedAt: now,
		},
	})

	p.successTxn(ctx, txnID)

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"transaction_id": txnID,
	})
}
