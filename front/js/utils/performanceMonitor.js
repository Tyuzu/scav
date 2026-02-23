/**
 * Performance Monitoring Utilities
 * Tracks metrics like FCP, LCP, CLS, etc.
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.metrics = new Map();
    this.enabled = options.enabled ?? true;
    this.reportEndpoint = options.reportEndpoint || null;
    this.reportInterval = options.reportInterval || 60000; // 1 minute
    this.verbose = options.verbose ?? false;
  }

  /**
   * Mark a point in time
   */
  mark(name) {
    if (!this.enabled) return;
    performance.mark(name);
  }

  /**
   * Measure time between two marks
   */
  measure(name, startMark, endMark) {
    if (!this.enabled) return;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name).pop();
      if (measure) {
        this.metrics.set(name, measure.duration);
        if (this.verbose) {
          console.log(`[PerfMonitor] ${name}: ${measure.duration.toFixed(2)}ms`);
        }
      }
    } catch (error) {
      console.warn("[PerfMonitor] Failed to measure:", error);
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(name, value) {
    if (!this.enabled) return;
    this.metrics.set(name, value);
    if (this.verbose) {
      console.log(`[PerfMonitor] ${name}: ${value}`);
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get specific metric
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * Report metrics (optionally send to server)
   */
  async reportMetrics() {
    if (!this.enabled) return;

    const metrics = this.getMetrics();

    if (this.reportEndpoint) {
      try {
        await fetch(this.reportEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            url: window.location.href,
            metrics
          }),
          signal: AbortSignal.timeout(5000)
        });
      } catch (error) {
        console.warn("[PerfMonitor] Failed to report metrics:", error);
      }
    }

    return metrics;
  }

  /**
   * Observe Core Web Vitals
   */
  observeWebVitals() {
    if (!this.enabled || typeof PerformanceObserver === "undefined") return;

    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric("LCP", lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric("CLS", clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          this.recordMetric("FID", entry.processingDuration);
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });

      // First Contentful Paint
      if (performance.getEntriesByType("paint")) {
        const paintEntries = performance.getEntriesByType("paint");
        const fcp = paintEntries.find((entry) => entry.name === "first-contentful-paint");
        if (fcp) {
          this.recordMetric("FCP", fcp.startTime);
        }
      }
    } catch (error) {
      console.warn("[PerformanceMonitor] Failed to observe vitals:", error);
    }
  }

  /**
   * Get navigation timing
   */
  getNavigationTiming() {
    if (!performance.timing) return null;

    const timing = performance.timing;
    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      domLoad: timing.domComplete - timing.domLoading,
      resourceLoad: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.navigationStart
    };
  }

  /**
   * Get memory info (Chrome only)
   */
  getMemoryInfo() {
    if (!performance.memory) return null;

    const m = performance.memory;
    return {
      usedMemory: m.usedJSHeapSize,
      totalMemory: m.totalJSHeapSize,
      memoryLimit: m.jsHeapSizeLimit,
      usagePercent: ((m.usedJSHeapSize / m.jsHeapSizeLimit) * 100).toFixed(2) + "%"
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      console.warn("[PerformanceMonitor] Failed to clear:", error);
    }
  }

  /**
   * Start auto-reporting
   */
  startAutoReport() {
    if (!this.enabled) return;

    this.reportInterval = setInterval(
      () => this.reportMetrics(),
      this.reportInterval
    );
  }

  /**
   * Stop auto-reporting
   */
  stopAutoReport() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }
}

export { PerformanceMonitor };
