package ratelim

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
	"golang.org/x/time/rate"
)

// RateLimiter is a middleware struct with configuration and visitor state
type RateLimiter struct {
	visitors     map[string]*visitorEntry
	mu           sync.RWMutex
	rate         rate.Limit
	burst        int
	cleanupAfter time.Duration
	maxEntries   int
	cleanupTick  *time.Ticker
	done         chan struct{}
}

type visitorEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter initializes a new RateLimiter
func NewRateLimiter(r rate.Limit, b int, cleanupAfter time.Duration, maxEntries int) *RateLimiter {
	rl := &RateLimiter{
		visitors:     make(map[string]*visitorEntry),
		rate:         r,
		burst:        b,
		cleanupAfter: cleanupAfter,
		maxEntries:   maxEntries,
		cleanupTick:  time.NewTicker(cleanupAfter / 2),
		done:         make(chan struct{}),
	}

	// Background cleanup goroutine (only one instead of unbounded)
	go rl.cleanupLoop()

	return rl
}

// cleanupLoop periodically removes stale entries
func (rl *RateLimiter) cleanupLoop() {
	for {
		select {
		case <-rl.done:
			rl.cleanupTick.Stop()
			return
		case <-rl.cleanupTick.C:
			rl.mu.Lock()
			now := time.Now()
			for ip, entry := range rl.visitors {
				if now.Sub(entry.lastSeen) > rl.cleanupAfter {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}
}

// getLimiter returns an existing limiter or creates a new one
func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.RLock()
	if entry, exists := rl.visitors[ip]; exists {
		// Update last seen time
		rl.mu.RUnlock()
		rl.mu.Lock()
		entry.lastSeen = time.Now()
		rl.mu.Unlock()
		return entry.limiter
	}
	rl.mu.RUnlock()

	// Check if we can add new entry
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Double-check after acquiring write lock
	if entry, exists := rl.visitors[ip]; exists {
		entry.lastSeen = time.Now()
		return entry.limiter
	}

	// Enforce max entries to avoid memory abuse
	if len(rl.visitors) >= rl.maxEntries {
		// Fallback to strict rate limiter
		return rate.NewLimiter(rate.Limit(0.1), 1)
	}

	limiter := rate.NewLimiter(rl.rate, rl.burst)
	rl.visitors[ip] = &visitorEntry{
		limiter:  limiter,
		lastSeen: time.Now(),
	}

	return limiter
}

// Stop gracefully shuts down cleanup goroutine
func (rl *RateLimiter) Stop() {
	close(rl.done)
}

// extractClientIP tries to determine the client's real IP address
func extractClientIP(r *http.Request) string {
	// Respect reverse proxy headers
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	// Otherwise use RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// Limit is the httprouter middleware for rate limiting
func (rl *RateLimiter) Limit(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ip := extractClientIP(r)
		limiter := rl.getLimiter(ip)

		if !limiter.Allow() {
			// Optional logging could go here
			http.Error(w, "Too many requests. Please try again later.", http.StatusTooManyRequests)
			return
		}

		next(w, r, ps)
	}
}
