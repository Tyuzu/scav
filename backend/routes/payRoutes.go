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

// func AddPayRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *ratelim.RateLimiter) {
// 	auth := middleware.Authenticate(app)

// 	payService := pay.NewPaymentService(app)
// 	payService.RegisterDefaultResolvers()

// 	router.GET("/api/v1/wallet/balance",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"))(
// 			payService.GetBalance,
// 		),
// 	)

// 	router.GET("/api/v1/wallet/transactions",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"))(
// 			payService.ListTransactions,
// 		),
// 	)

// 	router.POST("/api/v1/wallet/topup",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"), middleware.WithTxn)(
// 			payService.TopUp,
// 		),
// 	)

// 	router.POST("/api/v1/wallet/pay",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"), middleware.WithTxn)(
// 			payService.Pay,
// 		),
// 	)

// 	router.POST("/api/v1/wallet/transfer",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"), middleware.WithTxn)(
// 			payService.Transfer,
// 		),
// 	)

// 	router.POST("/api/v1/wallet/refund",
// 		middleware.Chain(rateLimiter.Limit, auth, middleware.RequireRoles("user"), middleware.WithTxn)(
// 			payService.Refund,
// 		),
// 	)
// }

// package routes

// import (
// 	"naevis/config"
// 	"naevis/middleware"
// 	"naevis/pay"
// 	"naevis/ratelim"

// 	"github.com/julienschmidt/httprouter"
// )

// // AddPayRoutes wires PaymentService handlers to the router
// func AddPayRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *ratelim.RateLimiter) {
// 	auth := middleware.Authenticate(app)
// 	// Create a single instance of PaymentService
// 	payService := pay.NewPaymentService()

// 	// Register resolvers (DI)
// 	payService.RegisterDefaultResolvers(app)

// 	// Wallet routes
// 	router.GET("/api/v1/wallet/balance",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 		)(payService.GetBalance),
// 	)

// 	router.POST("/api/v1/wallet/topup",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 			middleware.WithTxn,
// 		)(payService.TopUp),
// 	)

// 	router.POST("/api/v1/wallet/pay",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 			middleware.WithTxn,
// 		)(payService.Pay),
// 	)

// 	// Transfer & Refund
// 	router.POST("/api/v1/wallet/transfer",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 			middleware.WithTxn,
// 		)(payService.Transfer),
// 	)

// 	router.POST("/api/v1/wallet/refund",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 			middleware.WithTxn,
// 		)(payService.Refund),
// 	)

// 	// List transactions (read-only)
// 	router.GET("/api/v1/wallet/transactions",
// 		middleware.Chain(
// 			rateLimiter.Limit,
// 			auth,
// 			middleware.RequireRoles("user"),
// 		)(payService.ListTransactions),
// 	)
// }
