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
    for (let i = 0; i < 100000; i++) Math.sqrt(i);
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
    } catch (e) {
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
  if (document.getElementById("offline-banner")) return;
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
  if (banner) banner.remove();
}

window.addEventListener("offline", () => {
  clearTimeout(offlineTimer);
  offlineTimer = setTimeout(showOfflineBanner, 1000);
});

window.addEventListener("online", () => {
  clearTimeout(offlineTimer);
  offlineTimer = setTimeout(removeOfflineBanner, 1000);
});

// --- App Init ---
async function init() {
  try {
    await profileEnvironment();

    const lang = detectLanguage();
    await setLanguage(lang);
    await loadContent(window.location.pathname);

    window.addEventListener("popstate", async () => {
      if (!document.hidden) await loadContent(window.location.pathname);
    });

    window.addEventListener("pageshow", async (event) => {
      if (event.persisted) {
        console.log("Restored from bfcache");
        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || null;
        setState("token", token);
        await loadContent(window.location.pathname);
      }
    });

    window.addEventListener("pagehide", (event) => {
      if (event.persisted) console.log("Page *may* be cached by bfcache.");
    });

    if (!navigator.onLine) {
      showOfflineBanner();
      console.warn("📴 Offline mode: degraded functionality expected.");
    }
  } catch (error) {
    console.error("App init failed:", error);
    const errEl = document.createElement("h1");
    errEl.textContent = "⚠️ Something went wrong. Please reload.";
    document.body.replaceChildren(errEl);
  }
}

// // --- PWA Install Prompt ---
// let deferredPrompt = null;

// window.addEventListener("beforeinstallprompt", (e) => {
//   e.preventDefault();
//   deferredPrompt = e;

//   if (localStorage.getItem("pwa-dismissed")) return;

//   let installBtn = document.getElementById("install-pwa");
//   if (!installBtn) {
//     installBtn = document.createElement("button");
//     installBtn.id = "install-pwa";
//     installBtn.textContent = "Install App";
//     Object.assign(installBtn.style, {
//       position: "fixed",
//       top: "3rem",
//       right: "0",
//       zIndex: "10",
//       padding: "0.6rem 1rem",
//       background: "#1976d2",
//       color: "#fff",
//       border: "none",
//       borderRadius: "4px",
//       cursor: "pointer",
//     });
//     document.body.appendChild(installBtn);
//   }

//   installBtn.style.display = "block";
//   installBtn.addEventListener(
//     "click",
//     () => {
//       installBtn.style.display = "none";
//       deferredPrompt.prompt();
//       deferredPrompt.userChoice.then(({ outcome }) => {
//         if (outcome !== "accepted") localStorage.setItem("pwa-dismissed", "1");
//         deferredPrompt = null;
//       });
//     },
//     { once: true }
//   );
// });

// --- Start App ---
window.addEventListener("DOMContentLoaded", init);
