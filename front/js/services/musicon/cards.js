// cards.js
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { MusicAPI } from "./fetchers.js";
import { displayMusic } from "./wuzic.js";
import { loadPlaylistSongs, loadAlbumSongs } from "./loaders.js";


// ------------------------ Cards ------------------------
export function createPlaylistCard(playlist, container, player) {
    console.log(playlist);
    const card = createElement("div", { class: "playlist-card" }, [
        createElement("p", {}, [playlist.name || "Untitled Playlist"]),
        createElement("small", {}, [`${playlist.songs?.length || 0} songs`])
    ]);

    const viewBtn = createElement("button", {}, ["View"]);
    viewBtn.addEventListener("click", () => loadPlaylistSongs(playlist.playlistid, container, player));

    const delBtn = createElement("button", {}, ["Delete"]);
    delBtn.addEventListener("click", async () => {
        const res = await MusicAPI.removePlaylist(playlist.playlistid);
        if (res?.success) {
            // invalidate cache
            MusicAPI._cache.playlists = null;
            displayMusic(container, true, player);
        } else {
            Notify(`Failed to delete playlist: ${res?.error || "unknown"}`, { type: "error" });
        }
    });

    card.append(viewBtn, delBtn);
    return card;
}

export function createAlbumCard(album, container, player) {
    const card = createElement("div", { class: "album-card" }, [
        createElement("p", {}, [album.title || "Untitled Album"]),
        createElement("small", {}, [`${album.songs?.length || 0} songs`])
    ]);
    card.addEventListener("click", () => loadAlbumSongs(album.albumID, album.title, container, player));
    return card;
}
