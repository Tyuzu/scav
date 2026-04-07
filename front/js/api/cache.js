/**
 * Request Cache & Deduplication Layer
 * Prevents duplicate requests and caches GET responses
 */

class RequestCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000, maxBytes = 10_000_000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxBytes = maxBytes; // 10MB default
    this.bytesUsed = 0;
    this.ttlMs = ttlMs;
  }

  /**
   * Estimate size of response in bytes
   */
  _estimateSize(obj) {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  /**
   * Create cache key from request details
   */
  static createKey(url, method = "GET", _body = null) {
    // Only cache GET requests by default
    if (method !== "GET") {
      return null;
    }
    return `${method}:${url}`;
  }

  /**
   * Get cached response if valid
   */
  get(url, method = "GET") {
    const key = RequestCache.createKey(url, method);
    if (!key) {
return null;
}

    const entry = this.cache.get(key);
    if (!entry) {
return null;
}

    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(url, method = "GET", response) {
    const key = RequestCache.createKey(url, method);
    if (!key) {
return;
} // Don't cache non-GET requests

    const responseSize = this._estimateSize(response);
    
    // Prevent single response from exceeding 50% of max
    if (responseSize > this.maxBytes * 0.5) {
      console.warn(`[RequestCache] Response too large (${(responseSize / 1024).toFixed(1)}KB) for cache`);
      return;
    }

    // Evict entries until we have space (by size)
    while (this.bytesUsed + responseSize > this.maxBytes && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const evicted = this.cache.get(firstKey);
      this.bytesUsed -= evicted.size || 0;
      this.cache.delete(firstKey);
    }

    // Also evict by count if at max entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      const evicted = this.cache.get(firstKey);
      this.bytesUsed -= evicted.size || 0;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      size: responseSize
    });
    this.bytesUsed += responseSize;
  }

  /**
   * Clear specific entry or entire cache
   */
  clear(url = null, method = "GET") {
    if (!url) {
      this.cache.clear();
      this.bytesUsed = 0;
      return;
    }
    const key = RequestCache.createKey(url, method);
    if (key) {
      const entry = this.cache.get(key);
      if (entry) {
this.bytesUsed -= entry.size || 0;
}
      this.cache.delete(key);
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      bytesUsed: this.bytesUsed,
      maxBytes: this.maxBytes,
      percentageUsed: ((this.bytesUsed / this.maxBytes) * 100).toFixed(1),
      ttlMs: this.ttlMs
    };
  }
}

/**
 * In-flight request deduplication
 * Prevents duplicate concurrent requests
 */
class RequestDeduplicator {
  constructor() {
    this.inFlight = new Map();
  }

  /**
   * Create cache key from request details
   */
  static createKey(url, method = "GET") {
    return `${method}:${url}`;
  }

  /**
   * Get in-flight request promise or null
   */
  getInFlight(url, method = "GET") {
    const key = RequestDeduplicator.createKey(url, method);
    return this.inFlight.get(key);
  }

  /**
   * Mark request as in-flight
   */
  startRequest(url, method = "GET", promise) {
    const key = RequestDeduplicator.createKey(url, method);
    this.inFlight.set(key, promise);

    // Auto-cleanup when promise settles
    Promise.resolve(promise)
      .then(() => this.inFlight.delete(key))
      .catch(() => this.inFlight.delete(key));

    return promise;
  }

  /**
   * Clear specific request or all
   */
  clear(url = null, method = "GET") {
    if (!url) {
      this.inFlight.clear();
      return;
    }
    const key = RequestDeduplicator.createKey(url, method);
    this.inFlight.delete(key);
  }

  /**
   * Get count of in-flight requests
   */
  count() {
    return this.inFlight.size;
  }
}

export { RequestCache, RequestDeduplicator };
