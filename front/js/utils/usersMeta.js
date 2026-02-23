import { apiFetch } from "../api/api.js";

// in-memory cache
const userCache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

function getFromLocalStorage(id) {
    const raw = localStorage.getItem(`userMeta:${id}`);
    if (!raw) return null;
    try {
        const record = JSON.parse(raw);
        if (Date.now() > record.expires) {
            localStorage.removeItem(`userMeta:${id}`);
            return null;
        }
        return record.data;
    } catch {
        localStorage.removeItem(`userMeta:${id}`);
        return null;
    }
}

function setToLocalStorage(id, data) {
    const record = { data, expires: Date.now() + TTL_MS };
    localStorage.setItem(`userMeta:${id}`, JSON.stringify(record));
}

/**
 * Fetch minimal user info for given IDs.
 * Returns an object { userid: { username, name, avatar } }
 */
export async function fetchUserMeta(userIds = []) {
    const result = {};
    const missing = [];

    for (const id of userIds) {
        // check in-memory cache
        if (userCache.has(id)) {
            result[id] = userCache.get(id);
            continue;
        }

        // check localStorage
        const local = getFromLocalStorage(id);
        if (local) {
            userCache.set(id, local);
            result[id] = local;
            continue;
        }

        // mark as missing (needs server fetch)
        missing.push(id);
    }

    if (missing.length > 0) {
        try {
            const res = await apiFetch(`/users/meta?ids=${missing.join(",")}`);
            Object.entries(res).forEach(([id, data]) => {
                userCache.set(id, data);
                setToLocalStorage(id, data);
                result[id] = data;
            });
        } catch (err) {
            console.error("Failed to fetch user meta", err);
        }
    }
    console.log(result);

    return result;
}
