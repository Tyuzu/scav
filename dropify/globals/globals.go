package globals

import (
	"context"
	"log"
	"os"
)

// Context keys for request-scoped values
type ContextKey string

const (
	RoleKey   ContextKey = "role"
	UserIDKey ContextKey = "userId"
)

// JwtSecret gets JWT secret from environment or uses fallback
// WARNING: In production, always set JWT_SECRET environment variable
func JwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("WARNING: JWT_SECRET environment variable not set. Using default secret. This is insecure for production!")
		return []byte("your_secret_key_change_this_in_production")
	}
	return []byte(secret)
}

// Ctx returns the background context (should be replaced with context propagation)
// TODO: Replace with proper context propagation from http.Request
var Ctx = context.Background()
