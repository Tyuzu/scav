// toolbar.js
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { MusicAPI } from "./fetchers.js";
import { displayMusic } from "./wuzic.js"; // or forward ref if needed
import { createPlaylistCard } from "./cards.js";
import { renderSongsSection } from "./sections.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay, createToolbarButton, createBackButton } from "./uiHelpers.js";


// ------------------------ UI Helpers ------------------------
export function ensureToolbar(container, player, isLoggedIn) {
    // Create toolbar only once
    let toolbar = container.querySelector(".music-toolbar");
    if (toolbar) return toolbar;
    toolbar = createElement("div", { class: "music-toolbar" });
    container.prepend(toolbar);
    // Build toolbar contents after prepending to ensure UI order
    const viewPlaylistsBtn = createToolbarButton("View All Playlists", async () => {
        const content = getContentContainer(container);
        showLoadingOverlay(content, "Loading playlists...");
        const playlists = isLoggedIn ? await MusicAPI.playlists() : [];
        hideLoadingOverlay(content);
        content.replaceChildren();
        if (!playlists.length) content.append(createElement("p", {}, ["No playlists found."]));
        else content.append(...playlists.map(pl => createPlaylistCard(pl, content, player)));
    });

    const createPlaylistBtn = createToolbarButton("Create Playlist", async () => {
        const name = prompt("Enter playlist name:");
        if (!name) return;
        const res = await MusicAPI.createPlaylist({ name });
        if (res?.success) {
            // invalidate cache and update
            MusicAPI._cache.playlists = null;
            Notify("Playlist created!");
            displayMusic(container.parentElement, isLoggedIn);
        } else {
            Notify(`Failed to create playlist: ${res?.error || "unknown"}`, { type: "error" });
        }
    });

    const likesBtn = createToolbarButton("Liked Songs", async () => {
        const content = getContentContainer(container);
        showLoadingOverlay(content, "Loading liked songs...");
        const likedSongs = await MusicAPI.likedSongs();
        hideLoadingOverlay(content);
        content.replaceChildren();
        if (!likedSongs.length) content.append(createElement("p", {}, ["No liked songs."]));
        else renderSongsSection("Liked Songs", likedSongs, content, player);
    });

    toolbar.append(viewPlaylistsBtn, createPlaylistBtn, likesBtn);
    return toolbar;
}

export function ensureBackButton(container, player, isLoggedIn) {
    if (container.querySelector(".back-btn")) return;
    const backBtn = createElement("button", { class: "back-btn" }, ["⬅ Back"]);
    backBtn.addEventListener("click", () => displayMusic(container.parentElement, isLoggedIn));
    container.prepend(backBtn);
}
