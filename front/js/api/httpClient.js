/**
 * HTTP Client
 * Provides unified interface for making HTTP requests with:
 * - Request deduplication
 * - Response caching (for GET requests)
 * - Error handling
 * - Token refresh logic
 * - Retry logic
 */

import { RequestCache, RequestDeduplicator } from "./cache.js";
import { ErrorTracker, HTTPError, NetworkError } from "./errorHandler.js";
import { getState, setState } from "../state/state.js";

const requestCache = new RequestCache(100, 5 * 60 * 1000); // 5 min cache
const requestDedup = new RequestDeduplicator();
const errorTracker = new ErrorTracker({
  enabled: true,
  environment: import.meta?.env?.MODE || "production",
  trackRemote: false // Set to true if you have error tracking endpoint
});

/**
 * HTTP Client wrapper
 */
class HTTPClient {
  constructor(baseURL = "", options = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = options.defaultHeaders || {};
    this.timeout = options.timeout || 30000;
    this.retryCount = options.retryCount || 1;
    this.retryDelay = options.retryDelay || 1000;
    this.cache = options.cache !== false; // Enable caching by default
  }

  /**
   * Make HTTP request with all features (dedup, cache, retry, etc)
   */
  async request(endpoint, options = {}) {
    const method = options.method || "GET";
    const url = this.baseURL + endpoint;

    try {
      // Check cache (only for GET)
      if (this.cache && method === "GET") {
        const cached = requestCache.get(url, method);
        if (cached) {
          if (options.debug) console.log(`[HTTPClient] Cache HIT: ${method} ${url}`);
          return cached;
        }
      }

      // Check for in-flight request (deduplication)
      const inFlight = requestDedup.getInFlight(url, method);
      if (inFlight && method === "GET") {
        if (options.debug) console.log(`[HTTPClient] Dedup HIT: ${method} ${url}`);
        return inFlight;
      }

      // Prepare fetch options
      const fetchOptions = this._prepareFetchOptions(method, options);

      // Create abort signal with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      fetchOptions.signal = controller.signal;

      // Create request promise
      const requestPromise = (async () => {
        try {
          const response = await fetch(url, fetchOptions);

          clearTimeout(timeoutId);

          // Handle HTTP errors
          if (!response.ok) {
            const text = await response.text().catch(() => "");
            const error = new HTTPError(
              response.status,
              text || `HTTP ${response.status}`,
              { url, method }
            );

            // Track error
            errorTracker.track(error, { url, method, status: response.status });

            // Handle 401 - try refresh & retry once
            if (response.status === 401 && !options.retry) {
              const refreshed = await this._refreshToken();
              if (refreshed) {
                return this.request(endpoint, { ...options, retry: true });
              }
            }

            throw error;
          }

          // Handle 204 No Content
          if (response.status === 204) {
            if (this.cache && method === "GET") {
              requestCache.set(url, method, null);
            }
            return null;
          }

          // Parse response
          const text = await response.text().catch(() => "");
          let data = null;
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (e) {
              throw new Error("Invalid JSON response");
            }
          }

          // Cache GET responses
          if (this.cache && method === "GET") {
            requestCache.set(url, method, data);
          }

          return data;
        } catch (error) {
          clearTimeout(timeoutId);

          if (error.name === "AbortError") {
            const timeoutError = new NetworkError("Request timeout");
            errorTracker.track(timeoutError, { url, method, timeout: this.timeout });
            throw timeoutError;
          }

          if (error instanceof HTTPError) {
            throw error;
          }

          const networkError = new NetworkError(error.message);
          errorTracker.track(networkError, { url, method });
          throw networkError;
        }
      })();

      // Register for deduplication
      if (method === "GET") {
        requestDedup.startRequest(url, method, requestPromise);
      }

      return await requestPromise;
    } catch (error) {
      // Retry logic
      if (options.retry !== true && this.retryCount > 0) {
        options.retry = true;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.request(endpoint, options);
      }

      throw error;
    }
  }

  /**
   * Prepare fetch options (headers, body, etc)
   */
  _prepareFetchOptions(method, options) {
    const fetchOptions = {
      method,
      credentials: options.credentials ?? "include",
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    // Add auth token if needed
    if (options.auth !== false) {
      const token = getState("token");
      if (token) {
        fetchOptions.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Handle body
    if (options.body) {
      if (options.body instanceof FormData) {
        fetchOptions.body = options.body;
      } else if (typeof options.body === "object") {
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(options.body);
      } else {
        fetchOptions.body = options.body;
      }
    }

    return fetchOptions;
  }

  /**
   * Refresh expired token
   */
  async _refreshToken() {
    try {
      const res = await fetch(this.baseURL + "/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) return false;

      const data = await res.json();
      const token = data?.data?.token;
      if (!token) return false;

      setState({ token }, true);
      return true;
    } catch (error) {
      errorTracker.track(error, { context: "token_refresh" });
      return false;
    }
  }

  /**
   * GET request
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  /**
   * PATCH request
   */
  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  /**
   * DELETE request
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * PUT request
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * Clear cache
   */
  clearCache(endpoint = null) {
    if (endpoint) {
      requestCache.clear(this.baseURL + endpoint);
    } else {
      requestCache.clear();
    }
  }

  /**
   * Clear deduplication
   */
  clearDedup(endpoint = null) {
    if (endpoint) {
      requestDedup.clear(this.baseURL + endpoint);
    } else {
      requestDedup.clear();
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return requestCache.getStats();
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return errorTracker.getLog();
  }

  /**
   * Get error stats
   */
  getErrorStats() {
    return errorTracker.getStats();
  }

  /**
   * Clear error log
   */
  clearErrors() {
    errorTracker.clearLog();
  }
}

export { HTTPClient, requestCache, requestDedup, errorTracker };
