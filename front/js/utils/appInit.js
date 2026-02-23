/**
 * Application Initialization Best Practices
 * Shows how to use the new utilities for error tracking, performance monitoring, etc.
 */

import { errorTracker } from "../api/errorHandler.js";
import { PerformanceMonitor } from "../utils/performanceMonitor.js";
import { deferNonCritical } from "../utils/lazyLoad.js";

/**
 * Initialize error tracking
 */
export function initializeErrorTracking() {
  // Set user ID when authenticated
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = token.split(".")[1];
      const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));
      errorTracker.userId = decoded.userId || decoded.sub || "anonymous";
    } catch {
      errorTracker.userId = "anonymous";
    }
  }

  // Set environment
  const isDev = window.location.hostname.includes("localhost");
  errorTracker.environment = isDev ? "development" : "production";

  // Listen for uncaught errors
  window.addEventListener("error", (event) => {
    errorTracker.track(event.error || new Error(event.message), {
      type: "uncaught_error",
      filename: event.filename,
      lineno: event.lineno
    });
  });

  // Listen for unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    errorTracker.track(event.reason || new Error("Unhandled promise rejection"), {
      type: "unhandled_rejection"
    });
  });
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  const perfMonitor = new PerformanceMonitor({
    enabled: true,
    verbose: window.location.hostname.includes("localhost"),
    reportEndpoint: null // Set to your metrics endpoint
  });

  // Start observing Web Vitals
  perfMonitor.observeWebVitals();

  // Mark app initialization
  perfMonitor.mark("app-init-start");

  // Report metrics after page load
  window.addEventListener("load", () => {
    perfMonitor.mark("app-init-end");
    perfMonitor.measure("app-init", "app-init-start", "app-init-end");

    // Defer reporting to avoid blocking
    deferNonCritical([
      () => perfMonitor.reportMetrics()
    ]);
  });

  return perfMonitor;
}

/**
 * Initialize analytics tracking (example)
 */
export function initializeAnalytics() {
  // Defer analytics initialization to improve FCP
  deferNonCritical([
    () => {
      console.log("[Analytics] Deferred initialization complete");
      // Load your analytics library here
    }
  ]);
}

/**
 * Setup health checks
 */
export function setupHealthChecks() {
  // Monitor API health periodically
  setInterval(async () => {
    try {
      const response = await fetch("/api/v1/health", {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.warn("API health check failed:", response.status);
      }
    } catch (error) {
      console.warn("API health check error:", error);
      // Could track this to errorTracker
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Full app initialization
 */
export async function initializeApp() {
  try {
    // 1. Setup error tracking (do this first!)
    initializeErrorTracking();

    // 2. Setup performance monitoring
    const perfMonitor = initializePerformanceMonitoring();

    // 3. Setup analytics (deferred)
    initializeAnalytics();

    // 4. Setup health checks (deferred)
    deferNonCritical([setupHealthChecks]);

    console.log("[App] Initialization complete");

    // Expose for debugging
    if (window.location.hostname.includes("localhost")) {
      window.__APP_DEBUG = {
        perfMonitor,
        errorTracker,
        getMetrics: () => perfMonitor.getMetrics(),
        getErrors: () => errorTracker.getLog(),
        getNavigationTiming: () => perfMonitor.getNavigationTiming(),
        getMemoryInfo: () => perfMonitor.getMemoryInfo()
      };
      console.log("[App] Debug tools available at window.__APP_DEBUG");
    }
  } catch (error) {
    console.error("[App] Initialization failed:", error);
    errorTracker.track(error, { context: "app_init" });
  }
}

export default {
  initializeErrorTracking,
  initializePerformanceMonitoring,
  initializeAnalytics,
  setupHealthChecks,
  initializeApp
};
