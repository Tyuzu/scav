// toolbar.js

import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { MusicAPI } from "./fetchers.js";
import { displayMusic } from "./wuzic.js";
import { createPlaylistCard } from "./cards.js";
import { renderSongsSection } from "./sections.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";

export function ensureToolbar(container, player, isLoggedIn) {
    let toolbar = container.querySelector(".music-toolbar");
    if (toolbar) return toolbar;

    toolbar = createElement("div", { class: "music-toolbar" });
    container.prepend(toolbar);

    const content = getContentContainer(container);

    const viewPlaylistsBtn = createElement("button", {}, ["View Playlists"]);
    viewPlaylistsBtn.addEventListener("click", async () => {
        showLoadingOverlay(content, "Loading playlists...");
        const playlists = isLoggedIn ? await MusicAPI.playlists(true) : [];
        hideLoadingOverlay(content);
        content.replaceChildren();

        if (!playlists.length) {
            content.append(createElement("p", {}, ["No playlists found."]));
            return;
        }

        const frag = document.createDocumentFragment();
        playlists.forEach(pl => frag.append(createPlaylistCard(pl, container, player, isLoggedIn)));
        content.append(frag);
    });

    const createPlaylistBtn = createElement("button", {}, ["Create Playlist"]);
    createPlaylistBtn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("Login required", { type: "info" });
            return;
        }

        const name = prompt("Enter playlist name:");
        if (!name) return;

        createPlaylistBtn.disabled = true;
        try {
            const res = await MusicAPI.createPlaylist({ name });
            if (res?.success) {
                MusicAPI.invalidate();
                displayMusic(container.parentElement, isLoggedIn);
            } else {
                Notify("Failed to create playlist", { type: "error" });
            }
        } finally {
            createPlaylistBtn.disabled = false;
        }
    });

    const likesBtn = createElement("button", {}, ["Liked Songs"]);
    likesBtn.addEventListener("click", async () => {
        if (!isLoggedIn) {
            Notify("Login required", { type: "info" });
            return;
        }

        showLoadingOverlay(content, "Loading liked songs...");
        const likedSongs = await MusicAPI.likedSongs();
        hideLoadingOverlay(content);

        content.replaceChildren();

        if (!likedSongs.length) {
            content.append(createElement("p", {}, ["No liked songs."]));
        } else {
            renderSongsSection("Liked Songs", likedSongs, content, player);
        }
    });

    toolbar.append(viewPlaylistsBtn, createPlaylistBtn, likesBtn);
    return toolbar;
}

export function ensureBackButton(container, onClick) {
    if (container.querySelector(".back-btn")) return;

    const backBtn = createElement("button", { class: "back-btn" }, ["⬅ Back"]);
    backBtn.addEventListener("click", onClick);
    container.prepend(backBtn);
}