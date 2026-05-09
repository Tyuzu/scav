package bootstrap

import (
	"context"

	"naevis/infra"
	"naevis/infra/mq/subscriber"
)

func RegisterSubscribers(
	ctx context.Context,
	app *infra.Deps,
) error {

	/* =========================
	   AUTH
	========================= */

	if err := subscriber.RegisterAuthSubscribers(
		ctx,
		app.MQ,
	); err != nil {
		return err
	}

	// /* =========================
	//    ORDERS
	// ========================= */

	// if err := subscriber.RegisterOrderSubscribers(
	// 	ctx,
	// 	app.MQ,
	// ); err != nil {
	// 	return err
	// }

	// /* =========================
	//    REFUNDS
	// ========================= */

	// if err := subscriber.RegisterRefundSubscribers(
	// 	ctx,
	// 	app.MQ,
	// ); err != nil {
	// 	return err
	// }

	// /* =========================
	//    LISTINGS
	// ========================= */

	// if err := subscriber.RegisterListingSubscribers(
	// 	ctx,
	// 	app.MQ,
	// ); err != nil {
	// 	return err
	// }

	return nil
}
