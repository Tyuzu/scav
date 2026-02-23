// sections.js
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { getState } from "../../state/state.js";
import { createSongRow } from "./songUI.js";


/**
 * renderSongsSection
 * - uses DocumentFragment to reduce reflows
 * - keeps internal allSongs array and updates player queue when load more appends
 */
export function renderSongsSection(title, songs, container, player = null, batchSelection = null, loadMore = null) {
    let isL = Boolean(getState("user"));
    if (!songs?.length) return;
    const section = createElement("div", { class: "music-section" }, [createElement("h3", {}, [title])]);
    const list = createElement("div", { class: "songs-table" });

    // Use fragment to append all at once
    const frag = document.createDocumentFragment();
    const allSongs = songs.slice(); // local copy
    songs.forEach((song, idx) => frag.appendChild(createSongRow(song, idx, player, batchSelection, container, isL)));
    list.append(frag);
    section.append(list);

    // if loadMore is provided, attach smart loading that maintains queue and indices
    if (typeof loadMore === "function") {
        const loadMoreBtn = createElement("button", {}, ["Load More"]);
        let loading = false;
        loadMoreBtn.addEventListener("click", async () => {
            if (loading) return;
            loading = true;
            loadMoreBtn.disabled = true;
            const moreSongs = await loadMore();
            loading = false;
            loadMoreBtn.disabled = false;
            if (!moreSongs.length) {
                Notify("No more songs", { type: "info" });
                return;
            }
            const frag2 = document.createDocumentFragment();
            const startIndex = allSongs.length;
            moreSongs.forEach((s, i) => {
                frag2.appendChild(createSongRow(s, startIndex + i, player, batchSelection, container));
                allSongs.push(s);
            });
            list.append(frag2);
            // Update player queue to full combined list if player supports it
            if (player?.setQueue) player.setQueue(allSongs);
        });
        section.append(loadMoreBtn);
    }

    container.append(section);

    // Set queue initially using provided songs array
    if (player?.setQueue) player.setQueue(songs.slice());
}
