package media

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/infra/mq/subscriber"
)

// Subscriber registers all media domain event handlers
type Subscriber struct {
	deps *infra.Deps
}

// NewSubscriber creates a new media domain subscriber
func NewSubscriber(deps *infra.Deps) subscriber.Subscriber {
	return &Subscriber{
		deps: deps,
	}
}

// Register subscribes to all media-related domain events
func (s *Subscriber) Register(ctx context.Context, bus mq.MQ) error {
	handler := NewEventHandler(s.deps)

	// Subscribe to media.uploaded events from dropify service
	if err := bus.QueueSubscribe(
		ctx,
		mqevent.MediaUploaded,
		"media-processor",
		handler.HandleMediaUploaded,
	); err != nil {
		return fmt.Errorf("failed to subscribe to %s: %w", mqevent.MediaUploaded, err)
	}

	log.Printf("Media domain subscriber registered for %s", mqevent.MediaUploaded)
	return nil
}

// EventHandler handles media domain events
type EventHandler struct {
	deps *infra.Deps
}

// NewEventHandler creates a new event handler
func NewEventHandler(deps *infra.Deps) *EventHandler {
	return &EventHandler{
		deps: deps,
	}
}

// HandleMediaUploaded processes media.uploaded events from dropify
func (h *EventHandler) HandleMediaUploaded(ctx context.Context, data []byte) error {
	var payload mqevent.MediaUploadedPayload

	if err := json.Unmarshal(data, &payload); err != nil {
		log.Printf("Failed to unmarshal media.uploaded event: %v", err)
		return err
	}

	log.Printf("Processing media upload event: entity=%s, id=%s, file=%s",
		payload.EntityType, payload.EntityID, payload.FileName)

	// Get entity metadata based on type
	meta, ok := getEntityMetadata(payload.EntityType)
	if !ok {
		log.Printf("Unsupported entity type in media event: %s", payload.EntityType)
		return fmt.Errorf("unsupported entity type: %s", payload.EntityType)
	}

	// Build update document based on entity type
	updateFields := buildUpdateFields(&payload)

	// Update the entity in database
	if err := h.deps.DB.UpdateOne(
		ctx,
		meta.collectionName,
		bson.M{meta.keyField: payload.EntityID},
		bson.M{"$set": updateFields},
	); err != nil {
		log.Printf("Failed to update entity after media upload: %v", err)
		return err
	}

	// Invalidate cache if needed
	if meta.cacheKey != "" {
		cacheKey := meta.cacheKey + payload.EntityID
		if err := h.deps.Cache.Del(ctx, cacheKey); err != nil {
			log.Printf("Warning: Failed to invalidate cache for %s: %v", cacheKey, err)
			// Don't fail the whole operation due to cache issues
		}
	}

	log.Printf("Successfully processed media upload for %s:%s", payload.EntityType, payload.EntityID)
	return nil
}

// entityMetadata holds collection and field information for different entity types
type entityMetadata struct {
	collectionName string
	keyField       string
	cacheKey       string
	imageField     string
}

// getEntityMetadata returns metadata for an entity type
func getEntityMetadata(entityType string) (entityMetadata, bool) {
	metaMap := map[string]entityMetadata{
		"place": {
			collectionName: config.Collections.PlacesCollection,
			keyField:       "placeid",
			cacheKey:       "place:",
			imageField:     "imageUrls",
		},
		"event": {
			collectionName: config.Collections.EventsCollection,
			keyField:       "eventid",
			cacheKey:       "event:",
			imageField:     "imageUrls",
		},
		"baito": {
			collectionName: config.Collections.BaitoCollection,
			keyField:       "baitoid",
			cacheKey:       "baito:",
			imageField:     "imageUrls",
		},
		"baito_worker": {
			collectionName: config.Collections.BaitoWorkerCollection,
			keyField:       "baitoUserId",
			cacheKey:       "worker:",
			imageField:     "imageUrls",
		},
		"artist": {
			collectionName: config.Collections.ArtistsCollection,
			keyField:       "artistid",
			cacheKey:       "artist:",
			imageField:     "imageUrls",
		},
		"farm": {
			collectionName: config.Collections.FarmsCollection,
			keyField:       "farmid",
			cacheKey:       "farm:",
			imageField:     "imageUrls",
		},
		"crop": {
			collectionName: config.Collections.CropsCollection,
			keyField:       "cropid",
			cacheKey:       "crop:",
			imageField:     "imageUrls",
		},
		"feedpost": {
			collectionName: config.Collections.FeedPostsCollection,
			keyField:       "postid",
			cacheKey:       "feedpost:",
			imageField:     "imageUrls",
		},
		"user": {
			collectionName: config.Collections.UserCollection,
			keyField:       "userid",
			cacheKey:       "profile:",
			imageField:     "avatar",
		},
		"recipe": {
			collectionName: config.Collections.RecipeCollection,
			keyField:       "recipeid",
			cacheKey:       "recipe:",
			imageField:     "imageUrls",
		},
	}

	meta, ok := metaMap[entityType]
	return meta, ok
}

// buildUpdateFields creates the update document for database
func buildUpdateFields(payload *mqevent.MediaUploadedPayload) bson.M {
	meta, _ := getEntityMetadata(payload.EntityType)

	updateFields := bson.M{
		meta.imageField: payload.FilePath,
		"updated_at":    time.Now(),
	}

	return updateFields
}
