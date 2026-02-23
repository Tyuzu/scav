// src/utils/activityLogger.js
import { API_URL } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

const ENDPOINT = "/scitylana/event";
const STORAGE_KEY = "__analytics_queue__";
const INTERVAL_MS = 10000;
const MAX_BATCH = 20;
const MAX_RETRY_DELAY = 60000;
const RETRY_MULTIPLIER = 2;

// --- IDs ---
const SESSION_ID = (() => {
  const key = "__session_id__";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
})();

const USER_ID = (() => {
  const key = "__user_id__";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
})();

// --- Queue ---
let queue = loadQueue();
let isSyncing = false;
let retryDelay = 1000;

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

function clearQueue() {
  queue = [];
  localStorage.removeItem(STORAGE_KEY);
}

// --- Environment & metadata ---
function getEnvInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    lang: navigator.language,
    platform: navigator.platform,
    referrer: document.referrer || "Direct",
    url: window.location.href,
    ua: navigator.userAgent,
  };
}

// --- Queueing ---
function enqueue(event) {
  queue.push({ ...event, ts: Date.now() });
  saveQueue();
  if (queue.length >= MAX_BATCH) flush();
}

// --- Core sync ---
async function flush() {
  if (!queue.length || !navigator.onLine || isSyncing) return;

  isSyncing = true;
  const payload = queue.slice();

  async function attemptSend() {
    try {
      const res = await fetch(`${API_URL}${ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: payload }),
      });

      if (res.ok) {
        clearQueue();
        retryDelay = 1000;
        isSyncing = false;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("Activity sync failed:", err.message);
      retryDelay = Math.min(retryDelay * RETRY_MULTIPLIER, MAX_RETRY_DELAY);
      setTimeout(() => {
        if (navigator.onLine) attemptSend();
        else isSyncing = false;
      }, retryDelay);
    }
  }

  attemptSend();
}

// --- Tracking ---
function track(type, data = {}) {
  enqueue({
    type,
    data,
    session: SESSION_ID,
    user: USER_ID,
    ...getEnvInfo(),
  });
}

// Deduplicated tracking
const seenEvents = new Set();
function dedupTrack(key, type, data = {}) {
  if (seenEvents.has(key)) return;
  seenEvents.add(key);
  track(type, data);
}

// Throttle helper
function throttle(fn, delay) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

// --- Automatic events ---
track("pageview");

document.addEventListener("click", (e) => {
  const el = e.target.closest("a, button");
  if (!el) return;
  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.innerText?.slice(0, 40) || "";
  const href = el.href || null;
  track("click", { tag, label, href });
});

document.addEventListener(
  "scroll",
  throttle(() => {
    const scroll = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    track("scroll", { scroll });
  }, 5000)
);

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    track("input_focus", { name: el.name || el.id || "", type: el.type || "unknown" });
  }
});

// --- Time on page ---
let pageStart = Date.now();
window.addEventListener("beforeunload", () => {
  const duration = Date.now() - pageStart;
  track("time_on_page", { duration });
  flush();
});

// --- Network events ---
window.addEventListener("online", flush);

// --- Periodic flush ---
setInterval(flush, INTERVAL_MS);

// --- Public API ---
function trackPageView() { track("page_view"); }
function trackButtonClick(buttonName) { track("button_click", { button: buttonName }); }
function trackPurchase(itemId, price) { track("purchase", { itemId, price }); }

export {
  track,
  dedupTrack,
  trackPageView,
  trackButtonClick,
  trackPurchase,
  flush,
};
