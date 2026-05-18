package media

import (
	"context"
	"dropify/mqpubs"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Store struct {
	Collection *mongo.Collection
}

func NewStore(db *mongo.Database) *Store {
	col := db.Collection("media")

	// ensure idempotency
	index := mongo.IndexModel{
		Keys:    map[string]int{"eventId": 1},
		Options: options.Index().SetUnique(true),
	}

	_, _ = col.Indexes().CreateOne(context.Background(), index)

	return &Store{Collection: col}
}

func (s *Store) SaveMedia(ctx context.Context, evt mqpubs.UploadEvent) error {
	_, err := s.Collection.InsertOne(ctx, evt)
	if err != nil {
		// ignore duplicate (idempotent)
		if mongo.IsDuplicateKeyError(err) {
			return nil
		}
		return err
	}
	return nil
}
