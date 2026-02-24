// fetchers.js

import Notify from "../../components/ui/Notify.mjs";
import { musicFetch } from "../../api/api.js";

async function apiRequest(endpoint, method = "GET", body = null) {
    try {
        const res = await musicFetch(endpoint, method, body);
        return res || { success: false };
    } catch (err) {
        return { success: false, error: err?.message || "Network error" };
    }
}

async function safeFetch(endpoint) {
    const res = await apiRequest(endpoint);
    if (res?.success && Array.isArray(res.data)) return res.data;
    return [];
}

export const MusicAPI = {

    _cache: {
        playlists: null
    },

    invalidate() {
        this._cache.playlists = null;
    },

    playlists: async (force = false) => {
        if (!force && Array.isArray(MusicAPI._cache.playlists))
            return MusicAPI._cache.playlists;

        const data = await safeFetch("/musicon/user/playlists");
        MusicAPI._cache.playlists = data;
        return data;
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

    createPlaylist: (body) =>
        apiRequest("/musicon/playlists", "POST", body),

    addSongToPlaylist: (playlistID, body) =>
        apiRequest(`/musicon/playlists/${playlistID}/songs`, "POST", body),

    removePlaylist: (playlistID) =>
        apiRequest(`/musicon/playlists/${playlistID}`, "DELETE"),

    removeSongFromPlaylist: (playlistID, songid) =>
        apiRequest(`/musicon/playlists/${playlistID}/songs/${songid}`, "DELETE"),

    likedSongs: () =>
        safeFetch("/musicon/user/liked"),

    likeSong: (songid) =>
        apiRequest(`/musicon/user/liked/${songid}`, "POST"),

    unlikeSong: (songid) =>
        apiRequest(`/musicon/user/liked/${songid}`, "DELETE")
};