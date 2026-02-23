// songUI.js
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { MusicAPI } from "./fetchers.js";



// ------------------------ Add to Playlist Button in Song Row (with caching/error handling) ------------------------
export function createAddToPlaylistBtn(song, player, container, isLoggedIn) {
    const btn = createElement("button", { class: "add-to-playlist-btn" }, ["➕ Add to Playlist"]);
    btn.addEventListener("click", async () => {
        if (!isLoggedIn) return Notify("You must be logged in to add songs to playlists", { type: "info" });

        try {
            // try cached playlists first
            let playlists = await MusicAPI.playlists();
            if (!playlists.length) {
                Notify("No playlists available", { type: "info" });
                return;
            }

            // prompt user for selection
            const choice = prompt(`Select playlist by number:\n${playlists.map((pl, idx) => `${idx + 1}. ${pl.name}`).join("\n")}`);
            const index = parseInt(choice, 10) - 1;
            if (isNaN(index) || !playlists[index]) return Notify("Invalid selection", { type: "error" });

            // const playlistID = playlists[index].playlistID;
            const playlistID = playlists[index].playlistID || playlists[index].playlistid;

            console.log(playlistID);
            const res = await MusicAPI.addSongToPlaylist(playlistID, { songid: song.songid });
            if (res?.success) {
                Notify(`Added "${song.title}" to playlist "${playlists[index].name}"`);
                // optionally refresh cached playlists if API returns new playlist data (skip heavy refresh by default)
            } else if (res?.error && (String(res.error).toLowerCase().includes("unauthorized") || String(res.error).toLowerCase().includes("401") || String(res.error).toLowerCase().includes("403"))) {
                Notify("You are not authorized. Please log in.", { type: "info" });
            } else {
                Notify(`Failed to add song: ${res?.error || "unknown"}`, { type: "error" });
            }
        } catch (err) {
            console.error("[add-to-playlist] Error:", err);
            Notify("Network error while adding song to playlist", { type: "error" });
        }
    });
    return btn;
}

// ------------------------ Play / Like / Add Buttons ------------------------
export function createPlayButton(song, idx, player = null) {
    const btn = createElement("button", { class: "song-play-btn" }, ["▶"]);
    if (!song.audioUrl) { btn.disabled = true; return btn; }
    if (player) {
        btn.addEventListener("click", () => player.play(song, idx));
        // store reference for potential UI toggles
        song._playBtn = btn;
    }
    return btn;
}

export function createLikeButton(song, isLoggedIn) {
    const btn = createElement("button", { class: "like-btn" }, [song.liked ? "❤️" : "🤍"]);
    btn.addEventListener("click", async () => {
        if (!isLoggedIn) return Notify("You must be logged in to like songs", { type: "info" });

        try {
            if (song.liked) {
                const res = await MusicAPI.unlikeSong(song.songid);
                if (res?.success) {
                    song.liked = false;
                    setButtonTextSafely(btn, "🤍");
                    Notify(`Removed "${song.title}" from liked songs`);
                } else {
                    Notify(`Failed to remove like: ${res?.error || "unknown"}`, { type: "error" });
                }
            } else {
                const res = await MusicAPI.likeSong(song.songid);
                if (res?.success) {
                    song.liked = true;
                    setButtonTextSafely(btn, "❤️");
                    Notify(`Liked "${song.title}"`);
                } else if (res?.error && (String(res.error).toLowerCase().includes("unauthorized") || String(res.error).toLowerCase().includes("401") || String(res.error).toLowerCase().includes("403"))) {
                    Notify("You are not authorized. Please log in.", { type: "info" });
                } else {
                    Notify(`Failed to like song: ${res?.error || "unknown"}`, { type: "error" });
                }
            }
        } catch (err) {
            console.error("[like] Error:", err);
            Notify("Network error while updating liked songs", { type: "error" });
        }
    });
    return btn;
}

// ------------------------ Song Row + render optimizations ------------------------
export function createSongRow(song, idx, player = null, batchSelection = null, container = null, isLoggedIn = false) {
    console.log(isLoggedIn);
    // Resolve images/urls
    song.poster = song.poster ? resolveImagePath(EntityType.SONG, PictureType.THUMB, song.poster) : "/placeholder.png";
    song.audioUrl = song.audioUrl ? resolveImagePath(EntityType.SONG, PictureType.AUDIO, song.audioUrl) : null;

    const playBtn = createPlayButton(song, idx, player);
    const poster = createElement("img", { src: song.poster, alt: song.title, class: "song-poster" });
    const title = createElement("div", { class: "song-title" }, [song.title || "Untitled"]);

    // precompute duration string if provided, else leave blank placeholder
    const duration = song.duration || "";
    const meta = createElement("div", { class: "song-meta" }, [ `${song.genre || ""} • ${duration}` ]);

    const rowChildren = [playBtn, poster, title, meta];

    // Add "Add to Playlist" button (uses cached playlists)
    if (player && container) {
        const addBtn = createAddToPlaylistBtn(song, player, container, isLoggedIn);
        rowChildren.push(addBtn);
    }

    // Add Like/Unlike button
    if (isLoggedIn) {
        const likeBtn = createLikeButton(song, isLoggedIn);
        rowChildren.push(likeBtn);
    }

    if (batchSelection) {
        const checkbox = createElement("input", { type: "checkbox" });
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) batchSelection.add(song.songid);
            else batchSelection.delete(song.songid);
        });
        rowChildren.unshift(checkbox);
    }

    const row = createElement("div", { class: "song-row", "data-songid": song.songid }, rowChildren);
    return row;
}

