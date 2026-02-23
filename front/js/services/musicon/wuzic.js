// wuzic.js

import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { MusicAPI } from "./fetchers.js";
import {initPlayer} from "./player.js";
import { getContentContainer, showLoadingOverlay, hideLoadingOverlay } from "./uiHelpers.js";
import { ensureToolbar, ensureBackButton } from "./toolbar.js";
import { createPlaylistCard, createAlbumCard } from "./cards.js";
import { renderSongsSection } from "./sections.js";


export async function displayMusic(xcon, isLoggedIn) {
    const container = createElement("div", { class: "musicon" }, []);
    xcon.appendChild(container);

    const player = initPlayer(container);
    ensureToolbar(container, player, isLoggedIn);
    ensureBackButton(container, player, isLoggedIn);

    const content = getContentContainer(container);
    showLoadingOverlay(content, "Loading music...");

    try {
        const artistID = "zJbQfaZ7pyoq"; // should come from context

        const [
            playlists,
            albums,
            recommended,
            recommendedAlbums,
            artistSongs,
            personalized
        ] = await Promise.all([
            isLoggedIn ? MusicAPI.playlists() : [],
            MusicAPI.albums(),
            MusicAPI.recommendedSongs(),
            MusicAPI.recommendedAlbums(),
            MusicAPI.artistSongs(artistID),
            isLoggedIn ? MusicAPI.personalizedRecommendations() : []
        ]);

        content.replaceChildren();

        if (artistSongs.length) renderSongsSection("Artist Songs", artistSongs, content, player);
        if (personalized.length) renderSongsSection("Because You Listened", personalized, content, player);
        if (recommended.length) renderSongsSection("Recommended for You", recommended, content, player);

        if (playlists.length) {
            const frag = document.createDocumentFragment();
            playlists.forEach(pl => frag.append(createPlaylistCard(pl, content, player)));
            content.append(frag);
        }

        if (albums.length) {
            const frag = document.createDocumentFragment();
            albums.forEach(a => frag.append(createAlbumCard(a, content, player)));
            content.append(frag);
        }

        if (!artistSongs.length && !personalized.length && !recommended.length && !playlists.length && !albums.length) {
            content.append(createElement("p", {}, ["No music available."]));
        }
    } catch (err) {
        console.error("[displayMusic] Error:", err);
        Notify("Failed to load music", { type: "error" });
        content.replaceChildren(createElement("p", {}, ["Error loading music."]));
    } finally {
        hideLoadingOverlay(content);
    }
}

