package infra

import (
	"context"
	"dropify/config"
	"dropify/infra/cache"
	"dropify/infra/mq"
	"dropify/mqpubs"
	"log"
	"os"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
)

type Deps struct {
	Cache  cache.Cache
	MQ     mq.MQ
	Config config.Config

	MediaPublisher *mqpubs.Publisher
	NatsConn       *nats.Conn
}

/* -------------------- Constructor -------------------- */

func New(cfg *config.Config) (*Deps, error) {

	/* -------- Redis -------- */

	redisAddr := env("REDIS_ADDR", "localhost:6379")
	redisPassword := env("REDIS_PASSWORD", "")

	rclient := NewRedis(redisAddr, redisPassword, 0)
	cacheLayer := cache.NewRedisCache(rclient)

	/* -------- NATS JetStream -------- */

	natsURL := env("NATS_URL", nats.DefaultURL)

	nc, js, err := NewJetStream(natsURL)
	if err != nil {
		return nil, err
	}

	// MQ layer (used by consumers)
	mqLayer := mq.NewJetStreamMQ(js, "naevis-consumer")

	// Publisher (uses raw JetStream)
	mediaPublisher := mqpubs.NewPublisher(js, "media.uploaded")

	log.Println("infra initialized")

	return &Deps{
		Cache:          cacheLayer,
		MQ:             mqLayer,
		Config:         *cfg,
		MediaPublisher: mediaPublisher,
		NatsConn:       nc,
	}, nil
}

/* -------------------- Shutdown -------------------- */

func (d *Deps) Shutdown(ctx context.Context) {
	if d.MediaPublisher != nil {
		d.MediaPublisher.Shutdown(ctx)
	}

	if d.NatsConn != nil {
		_ = d.NatsConn.Drain()
	}
}

/* -------------------- Helpers -------------------- */

func env(key string, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

/* -------------------- Redis -------------------- */

func NewRedis(addr string, password string, dbIndex int) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       dbIndex,
	})
}

/* -------------------- NATS -------------------- */

func NewJetStream(url string) (*nats.Conn, nats.JetStreamContext, error) {
	nc, err := nats.Connect(url)
	if err != nil {
		return nil, nil, err
	}

	js, err := nc.JetStream()
	if err != nil {
		_ = nc.Drain()
		return nil, nil, err
	}

	return nc, js, nil
}
