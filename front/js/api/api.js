import {
    API_URL,
    SRC_URL,
    setState,
    getState,
    CHAT_URL,
    BANNERDROP_URL,
    LIVE_URL,
    MERE_URL,
    STRIPE_URL,
    MUSIC_URL
} from "../state/state.js";

import { silentLogout } from "../services/auth/authService.js";
import Notify from "../components/ui/Notify.mjs";

/* =========================
   CONSTANTS
========================= */

const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes
const REFRESH_LOCK_TTL = 10_000; // 10s

/* =========================
   MULTI TAB
========================= */

const TAB_ID =
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : generateUUID();
const REFRESH_LOCK_KEY = "__refresh_lock__";
const AUTH_CHANNEL = new BroadcastChannel("auth_channel");

/* =========================
   HELPERS
========================= */

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseJwt(token) {
    try {
        const payload = token?.split(".")[1];
        if (!payload) {
return null;
}
        // handle URL-safe base64
        const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        // pad
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function isTokenNearExpiry(token, bufferMs = REFRESH_BUFFER_MS) {
    const payload = parseJwt(token);
    if (!payload?.exp) {
return false;
}
    return Date.now() > payload.exp * 1000 - bufferMs;
}

/* =========================
   REFRESH LOCK (CROSS TAB)
========================= */

function acquireRefreshLock() {
    const now = Date.now();
    try {
        const raw = localStorage.getItem(REFRESH_LOCK_KEY);
        if (raw) {
            const lock = JSON.parse(raw);
            // valid lock held by another tab
            if (now - (lock.ts || 0) < REFRESH_LOCK_TTL) {
                return lock.owner === TAB_ID;
            }
        }

        // acquire lock
        localStorage.setItem(
            REFRESH_LOCK_KEY,
            JSON.stringify({ owner: TAB_ID, ts: now })
        );
        return true;
    } catch {
        return true;
    }
}

function releaseRefreshLock() {
    try {
        const raw = localStorage.getItem(REFRESH_LOCK_KEY);
        if (!raw) {
return;
}
        const { owner } = JSON.parse(raw);
        if (owner === TAB_ID) {
            localStorage.removeItem(REFRESH_LOCK_KEY);
        }
    } catch {}
}

/* =========================
   REFRESH (SINGLE FLIGHT)
========================= */

let refreshPromise = null;

async function refreshToken() {
    if (refreshPromise) {
return refreshPromise;
}

    refreshPromise = (async () => {
        // If another tab holds the lock, wait for its broadcast (single-flight)
        if (!acquireRefreshLock()) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (!e?.data) {
return;
}
                    if (e.data.type === "TOKEN_REFRESHED") {
                        AUTH_CHANNEL.removeEventListener("message", handler);
                        const token = getState("token");
                        resolve(Boolean(token && !isTokenNearExpiry(token)));
                    } else if (e.data.type === "LOGOUT") {
                        AUTH_CHANNEL.removeEventListener("message", handler);
                        resolve(false);
                    }
                };

                AUTH_CHANNEL.addEventListener("message", handler);

                // fallback timeout
                setTimeout(() => {
                    AUTH_CHANNEL.removeEventListener("message", handler);
                    const token = getState("token");
                    resolve(Boolean(token && !isTokenNearExpiry(token)));
                }, REFRESH_LOCK_TTL);
            });
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // If unauthorized, treat as failure
            if (!res.ok) {
                // if 401 or 403 consider clearing client state
                return false;
            }

            // read JSON safely
            const data = await res.json().catch(() => null);
            const token = data?.data?.token;
            if (!token) {
return false;
}

            const parsed = parseJwt(token);
            if (!parsed) {
return false;
}

            // Keep compatibility with code that expects "user" or "userId"
            const userId = parsed.userId || parsed.userID || parsed.sub || "";
            const username = parsed.username || parsed.preferred_username || "";

            setState(
                {
                    token,
                    // maintain both keys to avoid breaking other modules
                    user: userId,
                    userId,
                    username,
                    role: parsed.role || parsed.roles || []
                },
                true
            );

            AUTH_CHANNEL.postMessage({ type: "TOKEN_REFRESHED", owner: TAB_ID });
            return true;
        } catch (err) {
            // Handle abort/timeout errors
            if (err.name === "AbortError") {
                console.warn("Token refresh timeout - logging out for security");
                silentLogout();
                return false;
            }
            console.error("Token refresh failed:", err);
            return false;
        } finally {
            releaseRefreshLock();
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/* =========================
   BACKGROUND REFRESH
========================= */

let refreshTimer = null;

function scheduleBackgroundRefresh() {
    if (refreshTimer) {
clearTimeout(refreshTimer);
}

    const token = getState("token");
    const payload = parseJwt(token);
    if (!payload?.exp) {
return;
}

    const refreshAt = payload.exp * 1000 - REFRESH_BUFFER_MS - Date.now();

    if (refreshAt <= 0) {
        // token already near/expired — attempt immediate refresh (best-effort)
        // don't await here; let it run in background
        refreshToken().catch(() => {});
        return;
    }

    refreshTimer = setTimeout(() => {
        refreshToken().catch(() => {});
    }, refreshAt);
}

AUTH_CHANNEL.addEventListener("message", e => {
    if (e.data?.type === "TOKEN_REFRESHED") {
        scheduleBackgroundRefresh();
    } else if (e.data?.type === "LOGOUT") {
        // another tab logged out -> clear local timer
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }
});

/* =========================
   CORE FETCH (NO CACHE)
========================= */

async function apixFetch(endpoint, method = "GET", body = null, options = {}, retry = false) {
    try {
        const token = getState("token");
        const nearExpiry = token && isTokenNearExpiry(token);

        if (nearExpiry && !retry) {
            const ok = await refreshToken();
            if (!ok) {
                return { success: false, error: "Unauthorized" };
            }
        }

        const fetchOptions = {
            method,
            credentials: options.credentials ?? "include",
            signal: options.signal,
            headers: {}
        };

        if (options.auth !== false && getState("token")) {
            fetchOptions.headers.Authorization = `Bearer ${getState("token")}`;
        }

        if (body) {
            if (body instanceof FormData) {
                fetchOptions.body = body;
            } else if (typeof body === "object") {
                fetchOptions.headers["Content-Type"] = "application/json";
                fetchOptions.body = JSON.stringify(body);
            } else {
                fetchOptions.body = body;
            }
        }

        const res = await fetch(endpoint, fetchOptions);

        if (res.status === 401 && !retry && !nearExpiry) {
            const refreshed = await refreshToken();
            if (refreshed) {
                return apixFetch(endpoint, method, body, options, true);
            }
            return { success: false, error: "Unauthorized" };
        }

        let data = null;
        let text = "";

        try {
            text = await res.text();
        } catch {
            text = "";
        }

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                return {
                    success: false,
                    error: "Invalid JSON response"
                };
            }
        }

        if (!res.ok) {
            return {
                success: false,
                error: data?.message || data?.error || `HTTP ${res.status}`,
                status: res.status
            };
        }

        return data ?? { success: true };

    } catch (err) {
        return {
            success: false,
            error: err?.message || "Network failure"
        };
    }
}

/* =========================
   PUBLIC WRAPPERS
========================= */

function apiFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${API_URL}${endpoint}`, method, body, options).catch(err => {
        if (err?.message === "Unauthorized") {
            // clear state and navigate to login
            silentLogout();
        } else {
            Notify(err?.message || "Network error", { type: "error" });
        }
        throw err;
    });
}

export function liveFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${LIVE_URL}${endpoint}`, method, body, options);
}

export function bannerFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${BANNERDROP_URL}${endpoint}`, method, body, options);
}

export function chatFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${CHAT_URL}${endpoint}`, method, body, options);
}

export function mereFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${MERE_URL}${endpoint}`, method, body, options);
}

export function stripeFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${STRIPE_URL}${endpoint}`, method, body, {
        ...options,
        auth: false
    });
}

export function musicFetch(endpoint, method = "GET", body = null, options = {}) {
    return apixFetch(`${MUSIC_URL}${endpoint}`, method, body, options);
}

/* =========================
   INIT
========================= */

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        scheduleBackgroundRefresh();
    }
});

// initial schedule
scheduleBackgroundRefresh();

export {
    apiFetch,
    apixFetch,
    API_URL,
    SRC_URL,
    refreshToken,
    scheduleBackgroundRefresh
};
