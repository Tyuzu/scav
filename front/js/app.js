import { loadContent } from "./routes/index.js";
import { setState } from "./state/state.js";
import { detectLanguage, setLanguage } from "./i18n/i18n.js";

// --- Register Service Worker ---
// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/service-worker.js")
//       .then(async (reg) => {
//         await navigator.serviceWorker.ready;
//         console.log("🔌 Service worker active:", reg.scope);
//       })
//       .catch((err) => console.error("❌ Service worker registration failed:", err));
//   });
// }

// --- Environment Profiling ---
async function measureEnvironment() {
  const measurePerformance = async () => {
    const t0 = performance.now();
    for (let i = 0; i < 100000; i++) {
Math.sqrt(i);
}
    const t1 = performance.now();
    return Math.max(100 - (t1 - t0), 0);
  };

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return {
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    browser: isSafari
      ? "safari"
      : navigator.userAgent.includes("Firefox")
      ? "firefox"
      : navigator.userAgent.includes("Chrome")
      ? "chrome"
      : "unknown",
    networkSpeed: navigator.connection?.effectiveType || "unknown",
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    online: navigator.onLine,
    performanceScore: await measurePerformance(),
  };
}

async function profileEnvironment() {
  const ENV_CACHE_KEY = "env-profile-v1";
  const ENV_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  const cachedEnv = localStorage.getItem(ENV_CACHE_KEY);
  if (cachedEnv) {
    try {
      const parsed = JSON.parse(cachedEnv);
      if (Date.now() - parsed.ts < ENV_CACHE_TTL_MS) {
        setState("environment", parsed.data);
        window.__env = parsed.data;
        return;
      }
    } catch (_e) {
      localStorage.removeItem(ENV_CACHE_KEY); // Clear corrupted cache
    }
  }

  const envData = await measureEnvironment();
  setState("environment", envData);
  window.__env = envData;
  try {
    localStorage.setItem(ENV_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: envData }));
  } catch (e) {
    // Handle quota exceeded
    console.warn("⚠️ Cannot cache environment profile:", e.message);
  }

  // Determine UI tier
  let uiTier = localStorage.getItem("ui-tier-v1");
  if (!uiTier) {
    if (envData.deviceType === "mobile" || envData.networkSpeed.includes("2g")) {
      uiTier = "light";
    } else if (envData.performanceScore < 50) {
      uiTier = "medium";
    } else {
      uiTier = "full";
    }
    localStorage.setItem("ui-tier-v1", uiTier);
  }
}

// --- Offline Banner ---
let offlineTimer = null;

function showOfflineBanner() {
  if (document.getElementById("offline-banner")) {
return;
}
  const banner = document.createElement("div");
  banner.id = "offline-banner";
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    background: "#b00020",
    color: "#fff",
    textAlign: "center",
    padding: "0.5rem",
    zIndex: "9999",
    fontSize: "0.9rem",
  });
  banner.textContent = "📴 You're offline. Some features may not work.";
  document.body.appendChild(banner);
}

function removeOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (banner) {
banner.remove();
}
}

window.addEventListener("offline", () => {
  clearTimeout(offlineTimer);
  offlineTimer = setTimeout(showOfflineBanner, 1000);
});

window.addEventListener("online", () => {
  clearTimeout(offlineTimer);
  offlineTimer = setTimeout(removeOfflineBanner, 1000);
});

// --- Start App ---
window.addEventListener("error", (event) => {
  console.error("🚨 Uncaught error:", event.error);
  // Dispatch to error tracker if available
  if (window.__errorTracker) {
    window.__errorTracker.track(event.error, {
      type: "uncaught_error",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled rejection:", event.reason);
  // Dispatch to error tracker if available
  if (window.__errorTracker) {
    window.__errorTracker.track(event.reason, {
      type: "unhandled_rejection"
    });
  }
});

async function setupPerformanceMonitoring() {
  if (!window.PerformanceObserver) {
return;
}

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Flag slow operations (> 3 seconds)
        if (entry.duration > 3000) {
          console.warn(`⚠️ Slow operation: ${entry.name} (${entry.duration.toFixed(0)}ms)`);
          if (window.__errorTracker) {
            window.__errorTracker.track(new Error("Performance degradation"), {
              type: "slow_operation",
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      }
    });

    observer.observe({ 
      entryTypes: ["navigation", "resource", "paint", "largest-contentful-paint"]
    });
  } catch (e) {
    console.warn("Performance monitoring unavailable:", e);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await profileEnvironment();
    await setupPerformanceMonitoring();

    const lang = detectLanguage();
    await setLanguage(lang);
    await loadContent(window.location.pathname);

    window.addEventListener("popstate", async () => {
      if (!document.hidden) {
await loadContent(window.location.pathname);
}
    });

    window.addEventListener("pageshow", async (event) => {
      if (event.persisted) {
        console.warn("Restored from bfcache");
        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
        setState("token", token);
        await loadContent(window.location.pathname);
      }
    });

    window.addEventListener("pagehide", (event) => {
      if (event.persisted) {
        console.warn("Page *may* be cached by bfcache.");
      }
    });

    if (!navigator.onLine) {
      showOfflineBanner();
      console.warn("📴 Offline mode: degraded functionality expected.");
    }
  } catch (error) {
    console.error("🚨 App initialization failed:", error);
    if (window.__errorTracker) {
      window.__errorTracker.track(error, { type: "init_failure" });
    }
    const errEl = document.createElement("div");
    Object.assign(errEl.style, {
      padding: "2rem",
      textAlign: "center",
      fontFamily: "system-ui, -apple-system, sans-serif"
    });
    errEl.innerHTML = `
      <h1>⚠️ Application Error</h1>
      <p>Unable to start the application. Please refresh the page.</p>
      <p style="font-size: 0.9em; color: #666;">${error.message}</p>
    `;
    document.body.replaceChildren(errEl);
  }
});
