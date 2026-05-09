package subscriber

import (
	"context"
	"encoding/json"
	"log"

	"naevis/config/mqevent"
	"naevis/infra/mq"
)

func RegisterAuthSubscribers(
	ctx context.Context,
	bus mq.MQ,
) error {

	if err := bus.Subscribe(
		ctx,
		mqevent.UserRegistered,
		onUserRegistered,
	); err != nil {
		return err
	}

	if err := bus.Subscribe(
		ctx,
		mqevent.UserLoggedIn,
		onUserLoggedIn,
	); err != nil {
		return err
	}

	return nil
}

func onUserRegistered(
	ctx context.Context,
	data []byte,
) error {

	var payload mqevent.UserRegisteredPayload

	if err := json.Unmarshal(data, &payload); err != nil {
		return err
	}

	log.Printf(
		"user registered: %s",
		payload.UserID,
	)

	return nil
}

func onUserLoggedIn(
	ctx context.Context,
	data []byte,
) error {

	var payload mqevent.UserLoggedInPayload

	if err := json.Unmarshal(data, &payload); err != nil {
		return err
	}

	log.Printf(
		"user logged in: %s",
		payload.UserID,
	)

	return nil
}
