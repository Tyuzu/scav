package pay

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

const (
	webhookCollection     = "payment_webhooks"
	webhookAttempts       = "webhook_attempts"
	maxWebhookRetries     = 3
	webhookTimeoutSeconds = 30
)

// PaymentWebhookPayload represents incoming payment webhook data
type PaymentWebhookPayload struct {
	EventID          string                 `json:"eventId"`
	TransactionID    string                 `json:"transactionId"`
	OrderID          string                 `json:"orderId"`
	UserID           string                 `json:"userId"`
	Amount           float64                `json:"amount"`
	Currency         string                 `json:"currency"`
	Status           string                 `json:"status"` // "success", "failed", "pending"
	PaymentMethod    string                 `json:"paymentMethod"`
	PaymentTimestamp int64                  `json:"timestamp"`
	Signature        string                 `json:"signature"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// VerifyWebhookSignature validates webhook signature
func VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	expectedSignature := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// HandlePaymentWebhook processes incoming payment webhooks
func (p *PaymentService) HandlePaymentWebhook(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx, cancel := context.WithTimeout(r.Context(), webhookTimeoutSeconds*time.Second)
	defer cancel()

	// Read and validate webhook payload
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Failed to read webhook body: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify webhook signature (use environment variable for webhook secret)
	webhookSecret := "your-webhook-secret" // TODO: Use env var
	signature := r.Header.Get("X-Webhook-Signature")

	if !VerifyWebhookSignature(body, signature, webhookSecret) {
		log.Printf("Invalid webhook signature from %s", r.RemoteAddr)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var payload PaymentWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("Failed to parse webhook payload: %v", err)
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// Validate webhook payload
	if err := validateWebhookPayload(&payload); err != nil {
		log.Printf("Invalid webhook payload: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if webhook already processed (idempotency)
	var existingWebhook bson.M
	if err := p.app.DB.FindOne(ctx, webhookCollection, bson.M{
		"transactionId": payload.TransactionID,
	}, &existingWebhook); err == nil {
		// Webhook already processed, return success
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{
			"status": "already_processed",
		})
		return
	}

	// Process webhook based on status
	switch payload.Status {
	case "success":
		if err := p.processSuccessfulPayment(ctx, &payload); err != nil {
			logWebhookAttempt(ctx, p.app, &payload, "failed", err.Error())
			http.Error(w, "Failed to process payment", http.StatusInternalServerError)
			return
		}

	case "failed":
		if err := p.processFailedPayment(ctx, &payload); err != nil {
			logWebhookAttempt(ctx, p.app, &payload, "failed", err.Error())
			http.Error(w, "Failed to process failure", http.StatusInternalServerError)
			return
		}

	default:
		http.Error(w, "Unknown payment status", http.StatusBadRequest)
		return
	}

	// Record successful webhook processing
	if err := p.app.DB.InsertOne(ctx, webhookCollection, bson.M{
		"transactionId": payload.TransactionID,
		"orderId":       payload.OrderID,
		"userId":        payload.UserID,
		"status":        payload.Status,
		"amount":        payload.Amount,
		"processedAt":   time.Now(),
	}); err != nil {
		log.Printf("Failed to record webhook: %v", err)
	}

	logWebhookAttempt(ctx, p.app, &payload, "processed", "")

	utils.RespondWithJSON(w, http.StatusOK, map[string]string{
		"status": "processed",
	})
}

// processSuccessfulPayment updates account balances and order status
func (p *PaymentService) processSuccessfulPayment(ctx context.Context, payload *PaymentWebhookPayload) error {
	// Update account balance
	if err := p.app.DB.UpdateOne(ctx, accountsCollection, bson.M{
		"userid": payload.UserID,
	}, bson.M{
		"$inc": bson.M{
			"cached_balance": int64(payload.Amount),
		},
		"$set": bson.M{
			"updated_at": time.Now(),
		},
	}); err != nil {
		return err
	}

	// Update transaction status
	if err := p.app.DB.UpdateOne(ctx, transactionsCollection, bson.M{
		"_id": payload.TransactionID,
	}, bson.M{
		"$set": bson.M{
			"status":     "success",
			"updated_at": time.Now(),
		},
	}); err != nil {
		return err
	}

	return nil
}

// processFailedPayment marks transaction as failed
func (p *PaymentService) processFailedPayment(ctx context.Context, payload *PaymentWebhookPayload) error {
	if err := p.app.DB.UpdateOne(ctx, transactionsCollection, bson.M{
		"_id": payload.TransactionID,
	}, bson.M{
		"$set": bson.M{
			"status":     "failed",
			"updated_at": time.Now(),
		},
	}); err != nil {
		return err
	}

	return nil
}

// validateWebhookPayload checks required fields
func validateWebhookPayload(payload *PaymentWebhookPayload) error {
	if payload.TransactionID == "" {
		return fmt.Errorf("transaction_id_required: Transaction ID is required")
	}

	if payload.Amount <= 0 {
		return fmt.Errorf("invalid_amount: Amount must be positive")
	}

	if payload.Status == "" {
		return fmt.Errorf("status_required: Payment status is required")
	}

	// Verify timestamp is not too old (prevent replay attacks)
	if time.Now().Unix()-payload.PaymentTimestamp > 3600 { // 1 hour
		return fmt.Errorf("stale_timestamp: Payment timestamp too old")
	}

	return nil
}

// logWebhookAttempt records webhook processing attempt
func logWebhookAttempt(ctx context.Context, app *infra.Deps, payload *PaymentWebhookPayload, status string, reason string) {
	_, _ = ctx, app
	log.Printf("Webhook: %s - TxnID: %s, Status: %s, Reason: %s", status, payload.TransactionID, payload.Status, reason)
	// TODO: Store in database for monitoring
}
