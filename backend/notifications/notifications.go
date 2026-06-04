package notifications

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//
// DTO
//

type NotificationDTO struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Message     string    `json:"message"`
	EntityType  string    `json:"entityType"`
	EntityID    string    `json:"entityId"`
	RelatedUser string    `json:"relatedUser"`
	IsRead      bool      `json:"isRead"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func toDTO(n models.Notification) NotificationDTO {
	return NotificationDTO{
		ID:          n.ID,
		UserID:      n.UserID,
		Type:        n.Type,
		Title:       n.Title,
		Message:     n.Message,
		EntityType:  n.EntityType,
		EntityID:    n.EntityID,
		RelatedUser: n.RelatedUser,
		IsRead:      n.IsRead,
		CreatedAt:   n.CreatedAt,
		UpdatedAt:   n.UpdatedAt,
	}
}

//
// CREATE
//

func CreateNotification(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var body struct {
			UserID      string `json:"userId"`
			Type        string `json:"type"`
			Title       string `json:"title"`
			Message     string `json:"message"`
			EntityType  string `json:"entityType"`
			EntityID    string `json:"entityId"`
			RelatedUser string `json:"relatedUser"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		body.UserID = strings.TrimSpace(body.UserID)
		body.Type = strings.TrimSpace(body.Type)
		body.Message = strings.TrimSpace(body.Message)

		if body.UserID == "" || body.Type == "" || body.Message == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing required fields")
			return
		}

		notification := models.Notification{
			ID:          primitive.NewObjectID().Hex(),
			UserID:      body.UserID,
			Type:        body.Type,
			Title:       strings.TrimSpace(body.Title),
			Message:     body.Message,
			EntityType:  strings.TrimSpace(body.EntityType),
			EntityID:    strings.TrimSpace(body.EntityID),
			RelatedUser: strings.TrimSpace(body.RelatedUser),
			IsRead:      false,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := app.DB.Insert(ctx, notificationsCollection, notification); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create notification")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, toDTO(notification))
	}
}

//
// BULK CREATE
//

func BulkCreateNotifications(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var body struct {
			Notifications []struct {
				UserID      string `json:"userId"`
				Type        string `json:"type"`
				Title       string `json:"title"`
				Message     string `json:"message"`
				EntityType  string `json:"entityType"`
				EntityID    string `json:"entityId"`
				RelatedUser string `json:"relatedUser"`
			} `json:"notifications"`
		}

		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		if len(body.Notifications) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No notifications provided")
			return
		}

		var docs []interface{}
		var created []NotificationDTO

		for _, n := range body.Notifications {
			n.UserID = strings.TrimSpace(n.UserID)
			n.Type = strings.TrimSpace(n.Type)
			n.Message = strings.TrimSpace(n.Message)

			if n.UserID == "" || n.Type == "" || n.Message == "" {
				continue
			}

			notification := models.Notification{
				ID:          primitive.NewObjectID().Hex(),
				UserID:      n.UserID,
				Type:        n.Type,
				Title:       strings.TrimSpace(n.Title),
				Message:     n.Message,
				EntityType:  strings.TrimSpace(n.EntityType),
				EntityID:    strings.TrimSpace(n.EntityID),
				RelatedUser: strings.TrimSpace(n.RelatedUser),
				IsRead:      false,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			docs = append(docs, notification)
			created = append(created, toDTO(notification))
		}

		if len(docs) == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "No valid notifications")
			return
		}

		if err := app.DB.InsertMany(ctx, notificationsCollection, docs); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create notifications")
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
			"inserted": len(docs),
			"items":    created,
		})
	}
}

// GET USER NOTIFICATIONS (PAGINATED)
func GetUserNotifications(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := strings.TrimSpace(ps.ByName("userid"))
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		// -----------------------
		// Pagination defaults
		// -----------------------
		limit := 20
		page := 1

		q := r.URL.Query()

		if v := q.Get("limit"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		if v := q.Get("page"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				page = parsed
			}
		}

		if limit > 100 {
			limit = 100
		}

		skip := (page - 1) * limit

		// -----------------------
		// Mongo filter
		// -----------------------
		filter := bson.M{
			"userId": userID,
		}

		// -----------------------
		// Mongo options
		// -----------------------
		opts := options.Find().
			SetLimit(int64(limit)).
			SetSkip(int64(skip)).
			SetSort(bson.M{
				"createdAt": -1,
			})

		// -----------------------
		// Query
		// -----------------------
		var notifications []models.Notification

		if err := app.DB.FindMany(ctx, notificationsCollection, filter, &notifications, opts); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch notifications")
			return
		}

		// -----------------------
		// DTO mapping
		// -----------------------
		out := make([]NotificationDTO, len(notifications))
		for i, n := range notifications {
			out[i] = toDTO(n)
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"items": out,
			"page":  page,
			"limit": limit,
		})
	}
}

//
// UNREAD COUNT
//

func GetUnreadCount(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := strings.TrimSpace(ps.ByName("userid"))
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		filter := bson.M{"userId": userID, "isRead": false}

		count, err := app.DB.CountDocuments(ctx, notificationsCollection, filter)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to count notifications")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"count": count,
		})
	}
}

//
// MARK SINGLE READ (SECURE)
//

func MarkAsRead(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		notificationID := strings.TrimSpace(ps.ByName("notificationid"))
		userID := r.Header.Get("X-User-ID") // replace with real auth middleware

		if notificationID == "" || userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request")
			return
		}

		filter := bson.M{
			"_id":    notificationID,
			"userId": userID,
		}

		update := bson.M{
			"$set": bson.M{
				"isRead":    true,
				"updatedAt": time.Now(),
			},
		}

		if err := app.DB.UpdateOne(ctx, notificationsCollection, filter, update); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update notification")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]bool{"updated": true})
	}
}

//
// MARK ALL READ
//

func MarkAllAsRead(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := strings.TrimSpace(ps.ByName("userid"))
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		filter := bson.M{"userId": userID, "isRead": false}

		update := bson.M{
			"$set": bson.M{
				"isRead":    true,
				"updatedAt": time.Now(),
			},
		}

		if err := app.DB.UpdateMany(ctx, notificationsCollection, filter, update); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update notifications")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]bool{"updated": true})
	}
}

//
// DELETE SINGLE (SECURE)
//

func DeleteNotification(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		notificationID := strings.TrimSpace(ps.ByName("notificationid"))
		userID := r.Header.Get("X-User-ID")

		if notificationID == "" || userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request")
			return
		}

		filter := bson.M{
			"_id":    notificationID,
			"userId": userID,
		}

		if _, err := app.DB.DeleteOne(ctx, notificationsCollection, filter); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete notification")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	}
}

//
// CLEAR ALL
//

func ClearAllNotifications(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		userID := strings.TrimSpace(ps.ByName("userid"))
		if userID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
			return
		}

		filter := bson.M{"userId": userID}

		if err := app.DB.DeleteMany(ctx, notificationsCollection, filter); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete notifications")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	}
}
