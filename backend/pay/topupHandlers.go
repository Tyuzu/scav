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

func (p *PaymentService) TopUp(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var req struct {
		Amount int64  `json:"amount"`
		Method string `json:"method"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request")
		return
	}

	ok, _ := p.lock(ctx, userID)
	if !ok {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer p.unlock(ctx, userID)

	accID, err := p.getOrCreateAccount(ctx, userID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
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
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
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
