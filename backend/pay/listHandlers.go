package pay

import (
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (p *PaymentService) ListTransactions(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	skip, _ := strconv.ParseInt(r.URL.Query().Get("skip"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)

	if limit <= 0 || limit > 100 {
		limit = 10
	}

	var txns []models.Transaction

	filter := map[string]any{
		"$or": []map[string]any{
			{"userid": userID},
			{"meta.recipient": userID},
		},
	}

	err := p.app.DB.FindMany(
		ctx,
		transactionsCollection,
		filter,
		&txns,
		options.Find().
			SetSort(map[string]int{"created_at": -1}).
			SetSkip(skip).
			SetLimit(limit),
	)
	if err != nil {
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
