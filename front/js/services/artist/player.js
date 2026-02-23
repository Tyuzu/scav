// player.js
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { playSVG, pauseSVG } from "../../components/svgs.js";

// ------------------------ Player State ------------------------
const state = {
    container: null,
    audio: null,
    currentPlayBtn: null,
    currentIndex: -1,
    songQueue: [],
    isShuffle: false,
    isAutoplay: true
};

// ------------------------ DOM Helpers ------------------------
function updatePlayButtonIcon(btn, isPlaying) {
    if (!btn) return;
    btn.replaceChildren(isPlaying ? pauseSVG : playSVG);
}

// ------------------------ Footer Creation ------------------------
export function createPlayerFooter(container) {
    if (state.audio) return; // Already initialized

    const footer = createElement("footer", { class: "songs-footer" });
    const audio = createElement("audio", { id: "songs-audio", controls: true });
    state.audio = audio;

    const shuffleBtn = Button("Shuffle", "button", {
        click: () => {
            state.isShuffle = !state.isShuffle;
            shuffleBtn.classList.toggle("active", state.isShuffle);
        }
    }, "shuffle-btn");

    const autoplayBtn = Button("Autoplay", "button", {
        click: () => {
            state.isAutoplay = !state.isAutoplay;
            autoplayBtn.classList.toggle("active", state.isAutoplay);
        }
    }, "autoplay-btn");

    footer.append(shuffleBtn, autoplayBtn, audio);
    container.append(footer);

    audio.addEventListener("ended", () => {
        if (state.isAutoplay) playNextSong();
    });
}

// ------------------------ Playback Logic ------------------------
function playSong(song) {
    if (!state.audio || !song.audioUrl) return;

    // Pause if same song already playing
    if (state.audio.src.endsWith(`${song.audioextn}`) && !state.audio.paused) {
        state.audio.pause();
        updatePlayButtonIcon(state.currentPlayBtn, false);
        return;
    }

    // Reset previous button
    updatePlayButtonIcon(state.currentPlayBtn, false);

    // Load new song
    state.audio.src = `${song.audioUrl}${song.audioextn}`;
    state.audio.play();

    state.currentPlayBtn = song._playBtn;
    updatePlayButtonIcon(state.currentPlayBtn, true);
}

function playNextSong() {
    const { songQueue } = state;
    if (!songQueue.length) return;

    state.currentIndex = state.isShuffle
        ? Math.floor(Math.random() * songQueue.length)
        : (state.currentIndex + 1) % songQueue.length;

    const nextSong = songQueue[state.currentIndex];
    if (nextSong) playSong(nextSong);
}

// ------------------------ State Control ------------------------
function setSongQueue(songs) {
    state.songQueue = songs || [];
    state.currentIndex = -1;
}

function setCurrentIndex(idx) {
    state.currentIndex = idx;
}

function resetPlayer() {
    if (state.audio) state.audio.pause();
    state.container = null;
    state.audio = null;
    state.currentPlayBtn = null;
    state.currentIndex = -1;
    state.songQueue = [];
    state.isShuffle = false;
    state.isAutoplay = true;
}

// ------------------------ Public Interface ------------------------
function initPlayer(container) {
    if (!container) throw new Error("Container is required for player");
    state.container = container;
    createPlayerFooter(container);

    return {
        play: (song, idx) => {
            setCurrentIndex(idx);
            playSong(song);
        },
        playNext: playNextSong,
        setQueue: setSongQueue,
        reset: resetPlayer
    };
}

export {
    initPlayer,
    playSong,
    playNextSong,
    setSongQueue,
    setCurrentIndex,
    resetPlayer
};
