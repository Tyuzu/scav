package mq

import (
	"context"

	"github.com/nats-io/nats.go"
)

type JetStreamMQ struct {
	js nats.JetStreamContext
}

func NewJetStreamMQ(js nats.JetStreamContext) *JetStreamMQ {
	return &JetStreamMQ{
		js: js,
	}
}

type jetStreamSubscription struct {
	sub *nats.Subscription
}

func (s *jetStreamSubscription) Unsubscribe() error {
	return s.sub.Unsubscribe()
}

func (j *JetStreamMQ) Publish(
	ctx context.Context,
	subject string,
	data []byte,
) error {
	msg := &nats.Msg{
		Subject: subject,
		Data:    data,
	}

	_, err := j.js.PublishMsg(msg, nats.Context(ctx))
	return err
}

func (j *JetStreamMQ) Subscribe(
	ctx context.Context,
	subject string,
	handler MessageHandler,
) (Subscription, error) {

	sub, err := j.js.Subscribe(
		subject,
		func(msg *nats.Msg) {
			m := Message{
				Subject: msg.Subject,
				Data:    msg.Data,
			}

			if err := handler(ctx, m); err != nil {
				_ = msg.Nak()
				return
			}

			_ = msg.Ack()
		},
		nats.ManualAck(),
		nats.AckExplicit(),
	)

	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	return &jetStreamSubscription{
		sub: sub,
	}, nil
}

func (j *JetStreamMQ) QueueSubscribe(
	ctx context.Context,
	subject string,
	queue string,
	handler MessageHandler,
) (Subscription, error) {

	sub, err := j.js.QueueSubscribe(
		subject,
		queue,
		func(msg *nats.Msg) {
			m := Message{
				Subject: msg.Subject,
				Data:    msg.Data,
			}

			if err := handler(ctx, m); err != nil {
				_ = msg.Nak()
				return
			}

			_ = msg.Ack()
		},
		nats.ManualAck(),
		nats.AckExplicit(),
	)

	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	return &jetStreamSubscription{
		sub: sub,
	}, nil
}
