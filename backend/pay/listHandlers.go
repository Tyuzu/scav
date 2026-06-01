package pay

import (
	"naevis/models"
	"naevis/utils"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (p *PaymentService) ListTransactions(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var txns []models.Transaction
	if err := p.app.DB.FindMany(ctx, transactionsCollection,
		map[string]any{
			"$or": []map[string]any{
				{"userid": userID},
				{"meta.recipient": userID},
			},
		}, &txns,
	); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, txns)
}

func (p *PaymentService) GetBalance(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	var acc models.Account
	if err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &acc); err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "account not found")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"balance": acc.CachedBalance,
	})
}
