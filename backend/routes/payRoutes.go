// routes/pay.go
package routes

import (
	"naevis/infra"
	"naevis/middleware"
	"naevis/pay"
	"naevis/ratelim"

	"github.com/julienschmidt/httprouter"
)

func AddPayRoutes(r *httprouter.Router, app *infra.Deps, rl *ratelim.RateLimiter) {
	auth := middleware.Authenticate(app)

	paySvc := pay.NewPaymentService(app)
	paySvc.RegisterDefaultResolvers()

	r.GET("/api/v1/wallet/balance", middleware.Chain(rl.Limit, auth)(paySvc.GetBalance))
	r.POST("/api/v1/wallet/topup", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.TopUp))
	r.POST("/api/v1/wallet/pay", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Pay))
	r.POST("/api/v1/wallet/transfer", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Transfer))
	r.POST("/api/v1/wallet/refund", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Refund))
	r.GET("/api/v1/wallet/transactions", middleware.Chain(rl.Limit, auth)(paySvc.ListTransactions))
}
