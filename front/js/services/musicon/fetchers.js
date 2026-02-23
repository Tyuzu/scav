//fetchers.js
import Notify from "../../components/ui/Notify.mjs";
import { musicFetch } from "../../api/api.js";


// ------------------------ Generic API helpers & MusicAPI ------------------------
async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        console.log(`[api] ${method} ${endpoint}`, body ?? "");
        const res = await musicFetch(endpoint, method, body);
        return res || { success: false, error: "No response" };
    } catch (err) {
        console.error(`[api] Request failed ${method} ${endpoint}:`, err);
        return { success: false, error: err?.message || String(err) };
    }
}

/**
 * safeFetchArray - wrapper for endpoints that return arrays (keeps previous behaviour)
 * returns [] on failure, array on success.
 */
export async function safeFetch(endpoint, method = "GET", body = null) {
    const res = await apiRequest(endpoint, method, body);
    if (res?.success && Array.isArray(res.data)) return res.data;
    if (!res?.success) {
        console.warn(`[fetch] Failed ${method} ${endpoint}:`, res?.error);
        Notify(`Failed to fetch ${endpoint}`, { type: "error" });
    } else {
        console.warn(`[fetch] Unexpected response shape for ${endpoint}`, res);
        Notify(`Unexpected response from ${endpoint}`, { type: "error" });
    }
    return [];
}

/**
 * MusicAPI - centralized, cached access to music endpoints.
 * Methods return the underlying apiRequest result or arrays depending on semantics.
 */
export const MusicAPI = {
    _cache: {
        playlists: null // cached playlists array once fetched
    },

    // array-returning endpoints
    playlists: async (forceRefresh = false) => {
        if (!forceRefresh && Array.isArray(MusicAPI._cache.playlists)) return MusicAPI._cache.playlists;
        const arr = await safeFetch("/musicon/user/playlists");
        MusicAPI._cache.playlists = arr;
        return arr;
    },

    albums: () => safeFetch("/musicon/albums"),
    artistSongs: (id) => safeFetch(`/musicon/artists/${id}/songs`),
    playlistSongs: (playlistID, offset = 0, limit = 20) =>
        safeFetch(`/musicon/playlists/${playlistID}/songs?skip=${offset}&limit=${limit}`),
    albumSongs: (albumID, offset = 0, limit = 20) =>
        safeFetch(`/musicon/albums/${albumID}/songs?skip=${offset}&limit=${limit}`),
    recommendedSongs: () => safeFetch("/musicon/recommended"),
    recommendedAlbums: () => safeFetch("/musicon/recommended/albums"),
    personalizedRecommendations: () => safeFetch("/musicon/recommendations?based_on=recently_played"),

    // other HTTP verbs - return raw apiRequest result to detect status
    createPlaylist: (body) => apiRequest("/musicon/playlists", "POST", body),
    // addSongToPlaylist: (playlistID, body) => apiRequest(`/musicon/playlists/${playlistID}/songs/${body.songid}`, "POST", body),
    addSongToPlaylist: (playlistID, body) => apiRequest(`/musicon/playlists/${playlistID}/songs`, "POST", body),
    removePlaylist: (playlistID) => apiRequest(`/musicon/playlists/${playlistID}`, "DELETE"),
    removeSongFromPlaylist: (playlistID, songid) =>
        apiRequest(`/musicon/playlists/${playlistID}/songs/${songid}`, "DELETE"),

    // user liked songs endpoints
    likedSongs: () => safeFetch("/musicon/user/liked"),
    likeSong: (songid) => apiRequest(`/musicon/user/liked/${songid}`, "POST"),
    unlikeSong: (songid) => apiRequest(`/musicon/user/liked/${songid}`, "DELETE")
};

