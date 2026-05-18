package mqpubs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/nats-io/nats.go"
)

// ---------------- Event ----------------

type UploadEvent struct {
	EventID      string    `json:"eventId"`
	EventVersion string    `json:"eventVersion"`
	Filename     string    `json:"filename"`
	Extn         string    `json:"extn"`
	Key          string    `json:"key"`
	EntityType   string    `json:"entityType"`
	EntityID     string    `json:"entityId"`
	Resolutions  []int     `json:"resolutions"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	Mime         string    `json:"mime"`
	UploadedAt   time.Time `json:"uploadedAt"`
}

// ---------------- Publisher ----------------

type Publisher struct {
	js       nats.JetStreamContext
	subject  string
	queue    chan []byte
	workers  int
	shutdown chan struct{}
}

func NewPublisher(js nats.JetStreamContext, subject string) *Publisher {
	p := &Publisher{
		js:       js,
		subject:  subject,
		queue:    make(chan []byte, 10000),
		workers:  4,
		shutdown: make(chan struct{}),
	}

	for i := 0; i < p.workers; i++ {
		go p.worker()
	}

	return p
}

// ---------------- Public API ----------------

func (p *Publisher) PublishUpload(evt UploadEvent) {
	data, err := json.Marshal(evt)
	if err != nil {
		log.Println("marshal error:", err)
		return
	}

	select {
	case p.queue <- data:
	default:
		log.Println("publish buffer full, dropping event:", evt.EventID)
	}
}

func (p *Publisher) Publish(ctx context.Context, subject string, data []byte) error {
	select {
	case p.queue <- data:
		return nil
	default:
		return fmt.Errorf("publish buffer full")
	case <-ctx.Done():
		return ctx.Err()
	}
}

// ---------------- Worker ----------------

func (p *Publisher) worker() {
	for {
		select {
		case data := <-p.queue:
			p.publishWithRetry(data)
		case <-p.shutdown:
			return
		}
	}
}

func (p *Publisher) publishWithRetry(data []byte) {
	const maxRetries = 5

	for attempt := 0; attempt < maxRetries; attempt++ {

		ackFuture, err := p.js.PublishAsync(p.subject, data)
		if err != nil {
			log.Println("publish error:", err)
			time.Sleep(backoff(attempt))
			continue
		}

		select {
		case <-ackFuture.Ok():
			return

		case err := <-ackFuture.Err():
			log.Println("ack error:", err)

		case <-time.After(5 * time.Second):
			log.Println("ack timeout")
		}

		time.Sleep(backoff(attempt))
	}

	log.Println("failed to publish after retries")
}

// ---------------- Shutdown ----------------

func (p *Publisher) Shutdown(ctx context.Context) {
	close(p.shutdown)

	done := make(chan struct{})

	go func() {
		p.js.PublishAsyncComplete()
		close(done)
	}()

	select {
	case <-done:
	case <-ctx.Done():
		log.Println("publisher shutdown timeout")
	}
}

// ---------------- Backoff ----------------

func backoff(attempt int) time.Duration {
	base := 100 * time.Millisecond
	return time.Duration(1<<attempt) * base
}
