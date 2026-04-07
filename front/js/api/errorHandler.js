/**
 * Error Handler & Tracking
 * Centralizes error handling with optional remote tracking
 */

class ErrorTracker {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.trackingEndpoint = options.trackingEndpoint || null;
    this.environment = options.environment || "unknown";
    this.userId = options.userId || "anonymous";
    this.version = options.version || "1.0.0";
    this.errorLog = [];
    this.maxErrorLog = options.maxErrorLog || 50;
    this.shouldTrackRemote = options.trackRemote ?? false;
  }

  /**
   * Log error locally and optionally track remotely
   */
  async track(error, context = {}) {
    if (!this.enabled) {
return;
}

    const errorData = this._normalizeError(error, context);
    
    // Store locally
    this.errorLog.push(errorData);
    if (this.errorLog.length > this.maxErrorLog) {
      this.errorLog.shift();
    }

    // Log to console in development
    // Use import.meta.env.DEV for Vite or check environment string
    const isDev = import.meta?.env?.DEV || this.environment === "development";
    if (isDev) {
      console.error("[ErrorTracker]", errorData);
    }

    // Track remotely if enabled
    if (this.shouldTrackRemote && this.trackingEndpoint) {
      this._trackRemote(errorData).catch(err => {
        console.warn("Failed to track error remotely:", err);
      });
    }
  }

  /**
   * Normalize error into consistent format
   */
  _normalizeError(error, context = {}) {
    let message = "Unknown error";
    let stack = "";
    
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
    } else if (typeof error === "object") {
      message = error.message || JSON.stringify(error);
    }

    return {
      timestamp: new Date().toISOString(),
      message,
      stack,
      type: error?.constructor?.name || "Error",
      environment: this.environment,
      userId: this.userId,
      version: this.version,
      context,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown"
    };
  }

  /**
   * Send error to remote tracking service
   */
  async _trackRemote(errorData) {
    if (!this.trackingEndpoint) {
return;
}

    try {
      await fetch(this.trackingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorData),
        // Short timeout for error tracking
        signal: AbortSignal.timeout(5000)
      });
    } catch (err) {
      // Silently fail - don't create infinite loop
      // Use import.meta.env.DEV for Vite or check environment string
      const isDev = import.meta?.env?.DEV || this.environment === "development";
      if (isDev) {
        console.warn("Error tracking failed:", err);
      }
    }
  }

  /**
   * Get local error log
   */
  getLog() {
    return [...this.errorLog];
  }

  /**
   * Clear local error log
   */
  clearLog() {
    this.errorLog = [];
  }

  /**
   * Get summary stats
   */
  getStats() {
    return {
      totalErrors: this.errorLog.length,
      enabled: this.enabled,
      remoteTracking: this.shouldTrackRemote,
      environment: this.environment
    };
  }
}

/**
 * HTTP Error Handler
 */
class HTTPError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.name = "HTTPError";
    this.status = status;
    this.data = data;
  }

  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  isServerError() {
    return this.status >= 500;
  }

  isUnauthorized() {
    return this.status === 401;
  }

  isForbidden() {
    return this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }

  isRateLimit() {
    return this.status === 429;
  }

  isServerUnavailable() {
    return this.status === 503;
  }
}

/**
 * Network Error Handler
 */
class NetworkError extends Error {
  constructor(message = "Network error") {
    super(message);
    this.name = "NetworkError";
  }
}

export { ErrorTracker, HTTPError, NetworkError };
