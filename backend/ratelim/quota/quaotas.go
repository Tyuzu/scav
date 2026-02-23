package quota

import (
	"net/http"
	"time"
)

// QuotaStore is an abstraction over Redis or any atomic counter backend.
type QuotaStore interface {
	// Incr increments a counter and returns the new value.
	// Expire sets TTL on the key if it doesn't exist yet.
	Incr(key string, ttl time.Duration) (int64, error)
}

func QuotaMiddleware(store QuotaStore, limit int64, window time.Duration, keyFn func(*http.Request) string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := keyFn(r)

		count, err := store.Incr(key, window)
		if err != nil {
			http.Error(w, "quota check failed", http.StatusInternalServerError)
			return
		}

		if count > limit {
			http.Error(w, "quota exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
