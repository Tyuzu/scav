package middleware

import "net/http"

// SecurityHeaders applies a recommended set of HTTP security headers.
// Adjusted to allow media from external hosts and embed pages in iframes.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()

		// Prevent MIME sniffing
		h.Set("X-Content-Type-Options", "nosniff")

		// Allow embedding only for your own embed pages
		h.Set("X-Frame-Options", "SAMEORIGIN")

		// Content Security Policy:
		// - default-src 'self': only load scripts/styles from self
		// - media-src: allow your external static/video host
		// - frame-ancestors: allow iframes only from your domain
		h.Set("Content-Security-Policy",
			"default-src 'self'; "+
				"object-src 'none'; "+
				"base-uri 'self'; "+
				"frame-ancestors 'self'; "+ // allows iframes from same origin
				"form-action 'self'; "+
				"media-src 'self'; "+ // allow videos from static server
				"block-all-mixed-content;")

		// HSTS only on HTTPS; do not set for plain HTTP requests
		if r.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Referrer and feature controls
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Cross-origin policies to reduce data exfiltration surface
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Cross-Origin-Resource-Policy", "same-origin")

		// Caching: for authenticated API responses it's safer to prevent caching
		h.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
		h.Set("Pragma", "no-cache")
		h.Set("Expires", "0")

		next.ServeHTTP(w, r)
	})
}
