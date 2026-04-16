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
  "lang", "lastPath", "currentRoute", "routeCache", "routeState", "currentChatId", "isLoading"
]);

const PERSISTED_KEYS = ["token", "userProfile", "user", "username"];

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

      scheduleNotify(key, val);
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

// --- Route Cache ---
function getRouteModule(path) {
 return state.routeCache.get(path); 
}
function setRouteModule(path, module) {
 state.routeCache.set(path, module); 
}
function hasRouteModule(path) {
 return state.routeCache.has(path); 
}
function clearRouteCache() {
 state.routeCache.clear(); state.routeState.clear(); 
}

// --- Per-Route State ---
function getRouteState(path) {
  let route = state.routeState.get(path);
  if (!route) {
    route = Object.create(null);
    state.routeState.set(path, route);
  }
  return route;
}
function setRouteState(path, value) {
 state.routeState.set(path, value); 
}

// --- Clear State ---
function clearState(preserveKeys = []) {
  const preserved = {};
  for (const key of preserveKeys) {
    if (PERSISTED_KEYS.includes(key)) {
      preserved[key] = sessionStorage.getItem(key);
    }
  }

  sessionStorage.clear();
  localStorage.clear();

  for (const key of allowedKeys) {
    if (preserveKeys.includes(key) || key === "role") {
continue;
}
    if (key === "routeCache" || key === "routeState") {
      state[key].clear?.();
    } else {
      state[key] = null;
      scheduleNotify(key, null);
    }
  }

  for (const [key, value] of Object.entries(preserved)) {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  }

  // ✅ Ensure Maps always reinitialized safely
  if (!(state.routeCache instanceof Map)) {
state.routeCache = new Map();
}
  if (!(state.routeState instanceof Map)) {
state.routeState = new Map();
}
}

// --- Scroll State ---
function saveScroll(container, scrollState) {
 scrollState.scrollY = container?.scrollTop || 0; 
}
function restoreScroll(container, scrollState) {
 if (scrollState?.scrollY) {
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
