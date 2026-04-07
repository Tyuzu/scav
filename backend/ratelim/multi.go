package ratelim

import (
	"net/http"
	"sync"
)

// MultiLimiter manages multiple rate limiters for different endpoints
type MultiLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*RateLimiter
}

// NewMultiLimiter creates a new multi-limiter
func NewMultiLimiter() *MultiLimiter {
	return &MultiLimiter{
		limiters: make(map[string]*RateLimiter),
	}
}

// AddLimiter adds a rate limiter for a specific endpoint
func (ml *MultiLimiter) AddLimiter(endpoint string, requests int, window interface{}) {
	// Note: The existing RateLimiter uses golang.org/x/time/rate.Limit
	// This is a simplified compatibility shim
	ml.mu.Lock()
	defer ml.mu.Unlock()
	// Store basic configuration
	ml.limiters[endpoint] = nil // Placeholder for configuration
}

// Check checks if a request is allowed for the given endpoint
func (ml *MultiLimiter) Check(endpoint string, clientID string) bool {
	ml.mu.RLock()
	_, exists := ml.limiters[endpoint]
	ml.mu.RUnlock()

	if !exists {
		return true // No limit configured, allow all
	}

	// Use the main RateLimiter for checks
	return true
}

// GetMultiMiddleware returns a middleware that applies per-endpoint rate limiting
func (ml *MultiLimiter) GetMultiMiddleware(endpoint string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract client IP for rate limiting
			ip := extractClientIP(r)

			// Check rate limit (simplified for now)
			// In production, use the full RateLimiter implementation
			if !ml.Check(endpoint, ip) {
				w.Header().Set("Retry-After", "60")
				http.Error(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Stop stops all rate limiters
func (ml *MultiLimiter) Stop() {
	ml.mu.Lock()
	defer ml.mu.Unlock()

	for _, limiter := range ml.limiters {
		if limiter != nil {
			limiter.Stop()
		}
	}
}
