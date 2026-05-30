package mq

import "context"

type Message struct {
	Subject string
	Data    []byte
}

type MessageHandler func(ctx context.Context, msg Message) error

type Subscription interface {
	Unsubscribe() error
}

type MQ interface {
	Publish(ctx context.Context, subject string, data []byte) error

	Subscribe(
		ctx context.Context,
		subject string,
		handler MessageHandler,
	) (Subscription, error)

	QueueSubscribe(
		ctx context.Context,
		subject string,
		queue string,
		handler MessageHandler,
	) (Subscription, error)
}
