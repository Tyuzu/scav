// loaders.js
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { MusicAPI } from "./fetchers.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";
import { renderSongsSection } from "./sections.js";

// Generic loadSongs function to handle common logic
async function loadSongs(fetchFunction, fetchParams, container, player, options = {}) {
    const {
        loadingText = "Loading...",
        noSongsText = "No songs found.",
        title,
        enableBatchSelection = false,
        enableSearch = false,
        reloadCallback = null
    } = options;

    const content = getContentContainer(container);
    showLoadingOverlay(content, loadingText);
    const songs = await fetchFunction(...fetchParams);
    hideLoadingOverlay(content);

    content.replaceChildren();

    if (!songs.length) {
        content.append(createElement("p", {}, [noSongsText]));
        return;
    }

    let batchSelection = null;
    if (enableBatchSelection) {
        batchSelection = new Set();
        const batchActions = createElement("div", { class: "batch-actions" });
        const addBtn = createElement("button", {}, ["Add to Queue"]);
        addBtn.addEventListener("click", () => {
            const selected = songs.filter(s => batchSelection.has(s.songid));
            if (!selected.length) return Notify("No songs selected", { type: "info" });
            player?.setQueue?.(selected);
            Notify(`${selected.length} songs added to queue`);
        });

        const removeBtn = createElement("button", {}, ["Remove from Playlist"]);
        removeBtn.addEventListener("click", async () => {
            const selected = Array.from(batchSelection);
            if (!selected.length) return Notify("No songs selected", { type: "info" });
            try {
                await Promise.all(selected.map(id => MusicAPI.removeSongFromPlaylist(fetchParams[0], id)));
                Notify(`${selected.length} songs removed`);
                if (reloadCallback) reloadCallback();
            } catch (err) {
                console.error("[remove] Error:", err);
                Notify("Failed to remove songs", { type: "error" });
            }
        });

        batchActions.append(addBtn, removeBtn);
        content.append(batchActions);
    }

    const loadMoreFunction = async () => {
        const offset = songs.length;
        return await fetchFunction(...fetchParams, offset);
    };

    renderSongsSection(title, songs, content, player, batchSelection, loadMoreFunction);

    if (enableSearch) {
        const searchInput = createElement("input", { placeholder: "Search songs...", style: "margin:5px 0;" });
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            content.querySelectorAll(".song-row").forEach(row => {
                const titleEl = row.querySelector(".song-title");
                const title = titleEl ? (titleEl.firstChild?.textContent || "") : "";
                row.style.display = title.toLowerCase().includes(query) ? "" : "none";
            });
        });
        content.prepend(searchInput);
    }
}

// ------------------------ loadPlaylistSongs / loadAlbumSongs ------------------------
export async function loadPlaylistSongs(playlistID, container, player) {
    await loadSongs(
        MusicAPI.playlistSongs,
        [playlistID],
        container,
        player,
        {
            loadingText: "Loading playlist...",
            noSongsText: "No songs in this playlist.",
            title: "Playlist Songs",
            enableBatchSelection: true,
            enableSearch: true,
            reloadCallback: () => loadPlaylistSongs(playlistID, container, player)
        }
    );
}

export async function loadAlbumSongs(albumID, albumTitle, container, player) {
    await loadSongs(
        MusicAPI.albumSongs,
        [albumID],
        container,
        player,
        {
            loadingText: "Loading album...",
            noSongsText: "No songs in this album.",
            title: albumTitle,
            enableBatchSelection: false,
            enableSearch: false
        }
    );
}
