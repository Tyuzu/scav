/**
 * Lazy Loading Utilities
 * Provides utilities for code-splitting and dynamic imports
 */

/**
 * Lazy load a component/module
 * Useful for route-based code splitting
 */
export function lazyLoad(importFn) {
  return async function lazyComponent(...args) {
    try {
      const module = await importFn();
      const { render } = module;
      if (typeof render !== "function") {
        throw new Error("Module must export a render function");
      }
      return render(...args);
    } catch (error) {
      console.error("[lazyLoad] Failed to load:", error);
      throw error;
    }
  };
}

/**
 * Cache busting for lazy imports
 * Appends version hash to import URLs
 */
export function createLazyLoader(baseUrl, version = "1.0.0") {
  return {
    load: async (modulePath) => {
      const url = `${baseUrl}/${modulePath}?v=${version}`;
      return import(url);
    }
  };
}

/**
 * Preload modules in background
 * Useful for anticipating user actions
 */
export async function preloadModules(...importFns) {
  return Promise.all(
    importFns.map((importFn) =>
      importFn().catch((err) => {
        console.warn("[preloadModules] Failed to preload:", err);
        return null;
      })
    )
  );
}

/**
 * Intersection Observer-based lazy loading
 * Loads content when it enters viewport
 */
export function observeLazyElements(selector = "[data-lazy-src]", options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: "50px",
    threshold: 0.01,
    ...options
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const src = el.dataset.lazySrc;

        if (el.tagName === "IMG") {
          el.src = src;
          el.removeAttribute("data-lazy-src");
        } else if (el.tagName === "IFRAME") {
          el.src = src;
          el.removeAttribute("data-lazy-src");
        }

        observer.unobserve(el);
      }
    });
  }, defaultOptions);

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));

  return observer;
}

/**
 * Request Idle Callback polyfill for older browsers
 */
export const scheduleIdleTask = typeof requestIdleCallback !== "undefined"
  ? requestIdleCallback
  : (callback) => setTimeout(callback, 1000);

/**
 * Schedule non-critical tasks when browser is idle
 */
export function deferNonCritical(tasks = []) {
  tasks.forEach((task) => {
    scheduleIdleTask(() => {
      try {
        task();
      } catch (error) {
        console.warn("[deferNonCritical]", error);
      }
    });
  });
}

/**
 * Batch similar operations for better performance
 */
export class TaskBatcher {
  constructor(processFn, batchSize = 10, delayMs = 50) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.queue = [];
    this.timer = null;
  }

  add(task) {
    this.queue.push(task);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.delayMs);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      this.processFn(batch);
    }
  }

  clear() {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export default {
  lazyLoad,
  createLazyLoader,
  preloadModules,
  observeLazyElements,
  scheduleIdleTask,
  deferNonCritical,
  TaskBatcher
};
