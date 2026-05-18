package infra

import (
	"context"
	"dropify/config"
	"dropify/infra/cache"
	"dropify/infra/db"
	"dropify/infra/mq"
	"dropify/mqpubs"
	"log"
	"os"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Deps struct {
	DB     db.Database
	Cache  cache.Cache
	MQ     mq.MQ
	Config config.Config

	MediaPublisher *mqpubs.Publisher
	NatsConn       *nats.Conn
}

/* -------------------- Constructor -------------------- */

func New(cfg *config.Config) (*Deps, error) {

	/* -------- Mongo -------- */

	mongoURI := env("MONGO_URI", "mongodb://localhost:27017")
	mongoDB := env("MONGO_DB", "eventdb")

	client, database, err := NewMongo(mongoURI, mongoDB)
	if err != nil {
		return nil, err
	}

	dbLayer := db.NewMongoDatabase(database, client, 100)

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
		DB:             dbLayer,
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

/* -------------------- Mongo -------------------- */

func NewMongo(uri string, dbName string) (*mongo.Client, *mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(
		ctx,
		options.Client().
			ApplyURI(uri).
			SetMaxPoolSize(100).
			SetMinPoolSize(10).
			SetRetryWrites(true),
	)
	if err != nil {
		return nil, nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, nil, err
	}

	return client, client.Database(dbName), nil
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
