// --- API Configuration ---
import { apiConfig } from "../config/env.js";

export const webSiteName = "Farmium";

// Re-export API URLs from centralized config
export const {
  MAIN_URL,
  EMBED_URL,
  BANNERDROP_URL,
  API_URL,
  STRIPE_URL,
  AD_URL,
  SEARCH_URL,
  MERE_URL,
  MERE_WS,
  CHAT_URL,
  CHAT_WS,
  MUSIC_URL,
  LIVE_URL,
  SRC_URL,
  FILEDROP_URL,
  CHATDROP_URL
} = apiConfig;


// --- Allowed and persisted keys ---
const allowedKeys = new Set([
  "token", "user", "username", "userProfile", "socket", "role", "environment",
  "lang", "lastPath", "currentRoute", "routeCache", "routeState", "currentChatId", "isLoading", "userId"
]);

const PERSISTED_KEYS = ["token", "userProfile", "user", "username", "role"];

// --- Event system ---
const globalEvents = {};
function publish(eventName, data) {
  if (globalEvents[eventName]) {
    globalEvents[eventName].forEach(cb => cb(data));
  }
}
function globalSubscribe(eventName, callback) {
  if (!globalEvents[eventName]) {
    globalEvents[eventName] = [];
  }
  globalEvents[eventName].push(callback);
}

// --- Safe JSON parse ---
function safeParse(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
}

// --- Listeners ---
const listeners = new Map(); // top-level key => Set<callback>
const deepListeners = new Map(); // deep path => Set<callback>

// --- Batched notifications ---
const notifyQueue = new Set();
let notifyPending = false;

function getValueByPath(path) {
  return path.split(".").reduce((acc, part) => acc?.[part], state);
}

function scheduleNotify(key, value) {
  notifyQueue.add({ key, value });
  if (!notifyPending) {
    notifyPending = true;
    requestAnimationFrame(() => {
      for (const { key, value } of notifyQueue) {
        // top-level notifications
        const fns = listeners.get(key);
        if (fns) {
          for (const fn of fns) {
            fn(value);
          }
        }
        publish(`${key}Changed`, value);
        publish("stateChange", { [key]: value });

        // deep path notifications
        for (const [path, fns] of deepListeners) {
          if (path === key || path.startsWith(key + ".")) {
            const val = getValueByPath(path);
            for (const fn of fns) {
              fn(val);
            }
          }
        }
      }
      notifyQueue.clear();
      notifyPending = false;
    });
  }
}

// --- Deep proxy for reactivity (optimized - only for watched paths) ---
function createReactiveObject(obj, path = []) {
  // Don't proxy Maps or Sets
  if (obj instanceof Map || obj instanceof Set) {
    return obj;
  }

  // Only create proxy if this path has deep listeners
  const shouldProxy = Array.from(deepListeners.keys()).some(
    watchPath => watchPath.startsWith(path.join(".")) || path.join(".").startsWith(watchPath)
  );

  if (!shouldProxy && path.length > 0) {
    return obj; // Skip proxy if no listeners watching this path
  }

  return new Proxy(obj, {
    get(target, prop) {
      const val = target[prop];
      if (val && typeof val === "object" && !(val instanceof Map) && !(val instanceof Set)) {
        return createReactiveObject(val, path.concat(prop));
      }
      return val;
    },
    set(target, prop, value) {
      const oldValue = target[prop];
      if (oldValue === value) {
        return true;
      } // Skip if value unchanged

      target[prop] = value;
      const fullPath = path.concat(prop).join(".");
      scheduleNotify(fullPath, value);
      if (path.length > 0) {
        scheduleNotify(path[0], target);
      }
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      const fullPath = path.concat(prop).join(".");
      scheduleNotify(fullPath);
      if (path.length > 0) {
        scheduleNotify(path[0], target);
      }
      return true;
    }
  });
}

// Alias for backward compatibility
function reactive(obj, path = []) {
  return createReactiveObject(obj, path);
}

// --- Initialize reactive state ---
const rawState = {
  token: sessionStorage.getItem("token") || localStorage.getItem("token") || null,
  userProfile: safeParse("userProfile") || {},
  user: safeParse("user") || {},
  lastPath: window.location.pathname,
  lang: "en",
  currentRoute: null,
  routeCache: new Map(),
  routeState: new Map(),
  isLoading: false
};
const state = reactive(rawState);

// --- Core state functions ---
function getState(key) {
  if (!allowedKeys.has(key)) {
    throw new Error(`Invalid state key: ${key}`);
  }
  return state[key];
}

// --- State manipulation ---
function setState(keyOrObj, persist = false, value = undefined) {
  if (typeof keyOrObj === "object" && keyOrObj !== null) {
    for (const [key, val] of Object.entries(keyOrObj)) {
      if (!allowedKeys.has(key)) {
        throw new Error(`Invalid state key: ${key}`);
      }
      if (key === "routeCache" || key === "routeState") {
        console.warn(`⚠️ Skipping overwrite of ${key}`);
        continue;
      }
      state[key] = val;

      if (persist && PERSISTED_KEYS.includes(key)) {
        const str = typeof val === "string" ? val : JSON.stringify(val);
        sessionStorage.setItem(key, str);
        localStorage.setItem(key, str);
      }
    }
    return;
  }

  const key = keyOrObj;
  if (!allowedKeys.has(key)) {
    throw new Error(`Invalid state key: ${key}`);
  }
  if (key === "routeCache" || key === "routeState") {
    console.warn(`⚠️ Skipping overwrite of ${key}`);
    return;
  }

  state[key] = value;

  if (persist && PERSISTED_KEYS.includes(key)) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    sessionStorage.setItem(key, str);
    localStorage.setItem(key, str);
  }

  scheduleNotify(key, value);
  return value;
}

// --- Subscriptions with automatic cleanup ---
function subscribe(key, fn) {
  if (!allowedKeys.has(key)) {
    throw new Error(`Cannot subscribe to invalid key: ${key}`);
  }
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(fn);

  // Return unsubscribe function for automatic cleanup
  return () => {
    listeners.get(key)?.delete(fn);
    // Clean up empty listener sets
    if (listeners.get(key)?.size === 0) {
      listeners.delete(key);
    }
  };
}

function unsubscribe(key, fn) {
  listeners.get(key)?.delete(fn);
  // Clean up empty listener sets
  if (listeners.get(key)?.size === 0) {
    listeners.delete(key);
  }
}

// --- Deep path subscriptions with automatic cleanup ---
function subscribeDeep(path, fn) {
  if (!deepListeners.has(path)) {
    deepListeners.set(path, new Set());
  }
  deepListeners.get(path).add(fn);

  // Return unsubscribe function for automatic cleanup
  return () => {
    deepListeners.get(path)?.delete(fn);
    // Clean up empty listener sets
    if (deepListeners.get(path)?.size === 0) {
      deepListeners.delete(path);
    }
  };
}

function unsubscribeDeep(path, fn) {
  deepListeners.get(path)?.delete(fn);
  // Clean up empty listener sets
  if (deepListeners.get(path)?.size === 0) {
    deepListeners.delete(path);
  }
}

// --- Clear all listeners (useful for testing or cleanup) ---
function clearAllListeners() {
  listeners.clear();
  deepListeners.clear();
}

// // --- Store initialization ---
// function initStore() {
//   const saved = localStorage.getItem("user");
//   if (saved) {
//     state.user = JSON.parse(saved);
//     scheduleNotify("user", state.user);
//   }
// }
/* =========================
   ROUTE CACHE
========================= */

function getRouteModule(path) {
  return state.routeCache.get(path);
}

function setRouteModule(path, module) {
  state.routeCache.set(path, module);
  scheduleNotify("routeCache", state.routeCache);
}

function hasRouteModule(path) {
  return state.routeCache.has(path);
}

function clearRouteCache() {
  state.routeCache.clear();
  state.routeState.clear();

  scheduleNotify("routeCache", state.routeCache);
  scheduleNotify("routeState", state.routeState);
}

/* =========================
   PER-ROUTE STATE
========================= */

function getRouteState(path) {
  let route = state.routeState.get(path);

  if (!route) {
    route = Object.create(null);
    state.routeState.set(path, route);

    // notify creation
    scheduleNotify("routeState", state.routeState);
  }

  return route;
}

function setRouteState(path, value) {
  const prev = state.routeState.get(path);

  if (prev === value) {
    return;

  }

  state.routeState.set(path, value);

  scheduleNotify("routeState", state.routeState);
}

/* =========================
   CLEAR STATE
========================= */

function clearState(preserveKeys = []) {
  const preserved = {};

  // capture persisted values safely
  for (const key of preserveKeys) {
    if (PERSISTED_KEYS.includes(key)) {
      const val = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (val !== null) {
        preserved[key] = val;
      }
    }
  }

  sessionStorage.clear();
  localStorage.clear();

  for (const key of allowedKeys) {
    if (preserveKeys.includes(key)) {
      continue;

    }

    if (key === "routeCache" || key === "routeState") {
      state[key].clear?.();

      // ensure observers update
      scheduleNotify(key, state[key]);
      continue;
    }

    if (state[key] !== null) {
      state[key] = null;
      scheduleNotify(key, null);
    }
  }

  // restore preserved values
  for (const [key, value] of Object.entries(preserved)) {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);

    try {
      state[key] = JSON.parse(value);
    } catch {
      state[key] = value;
    }

    scheduleNotify(key, state[key]);
  }

  // enforce Map integrity
  if (!(state.routeCache instanceof Map)) {
    state.routeCache = new Map();
    scheduleNotify("routeCache", state.routeCache);
  }

  if (!(state.routeState instanceof Map)) {
    state.routeState = new Map();
    scheduleNotify("routeState", state.routeState);
  }
}

/* =========================
   SCROLL STATE
========================= */

function saveScroll(container, scrollState) {
  if (!scrollState) {
    return;

  }
  scrollState.scrollY = container?.scrollTop ?? 0;
}

function restoreScroll(container, scrollState) {
  if (!container || !scrollState) {
    return;

  }

  // allow 0 (valid scroll position)
  if ("scrollY" in scrollState) {
    container.scrollTop = scrollState.scrollY;
  }
}

// --- Role helpers ---
function hasRole(...roles) {
  const current = state.userProfile?.role;
  if (!current) {
    return false;
  }
  return roles.some(r => (Array.isArray(current) ? current : [current]).includes(r));
}
function isAdmin() {
  return hasRole("admin");
}

// --- Snapshot & Actions ---
function getGlobalSnapshot() {
  return Object.freeze({ ...state });
}
function setLoading(val) {
  setState("isLoading", val);
}


// --- Exports ---
export {
  state,

  getState, setState, clearState, getGlobalSnapshot,

  subscribe, unsubscribe, subscribeDeep, unsubscribeDeep, clearAllListeners,
  publish, globalSubscribe,

  saveScroll, restoreScroll,

  getRouteModule, setRouteModule, hasRouteModule, clearRouteCache,
  getRouteState, setRouteState,

  hasRole, isAdmin,
  setLoading,

};
