
// Constants
const DEFAULT_VOLUME = 1;
const DEFAULT_CROSSFADE_DURATION = 2;
const PROGRESS_BAR_MAX = 100;
const PROGRESS_BAR_STEP = 0.1;
const VOLUME_MIN = 0;
const VOLUME_MAX = 1;
const VOLUME_STEP = 0.01;
const REPEAT_MODES = ["all", "one", "none"];
const SHUFFLE_TEXT = "Shuffle";
const REPEAT_TEXT = "Repeat";

// PlayerState class to manage player state
class PlayerState {
    constructor() {
        this.audio = null;
        this.currentSong = null;
        this.currentIndex = -1;
        this.queue = [];
        this.repeat = "all";
        this.shuffle = false;
        this.volume = DEFAULT_VOLUME;
        this.crossfadeDuration = DEFAULT_CROSSFADE_DURATION;
        this._fadeInterval = null;
    }

    getState() {
        return {
            audio: this.audio,
            currentSong: this.currentSong,
            currentIndex: this.currentIndex,
            queue: [...this.queue],
            repeat: this.repeat,
            shuffle: this.shuffle,
            volume: this.volume,
            crossfadeDuration: this.crossfadeDuration,
            _fadeInterval: this._fadeInterval
        };
    }

    reset() {
        this.currentIndex = -1;
        this.currentSong = null;
        this.queue = [];
        this._clearFadeInterval();
    }

    _clearFadeInterval() {
        if (this._fadeInterval) {
            clearInterval(this._fadeInterval);
            this._fadeInterval = null;
        }
    }
}

// AudioPlayer class to handle audio playback logic
class AudioPlayer {
    constructor(state) {
        this.state = state;
    }

    async play(song, idx = undefined, startTime = 0) {
        if (!song || !song.audioUrl) return;
        const audio = this.state.audio;
        if (!audio) return;

        // if same song playing -> toggle pause
        if (this.state.currentSong === song && !audio.paused) {
            audio.pause();
            console.log(`[player] Paused: ${song.title}`);
            return;
        }

        const switchSong = () => {
            audio.src = `${song.audioUrl}${song.audioextn || ""}`;
            audio.currentTime = startTime;
            audio.volume = this.state.volume;
            audio.play();
            this.state.currentSong = song;
            if (typeof idx === "number") this.state.currentIndex = idx;
            console.log(`[player] Playing: ${song.title}`);
        };

        if (audio.src && !audio.paused && this.state.crossfadeDuration > 0 && this.state.currentSong) {
            this.state._clearFadeInterval();
            const fadeTime = this.state.crossfadeDuration;
            const step = 50;
            const steps = Math.max(1, Math.floor((fadeTime * 1000) / step));
            let vol = audio.volume;
            const volDelta = vol / steps;
            this.state._fadeInterval = setInterval(() => {
                vol -= volDelta;
                if (vol <= 0) {
                    this.state._clearFadeInterval();
                    audio.pause();
                    audio.volume = this.state.volume;
                    switchSong();
                } else audio.volume = Math.max(0, vol);
            }, step);
        } else {
            switchSong();
        }
    }

    playNext() {
        if (!this.state.queue?.length) return;
        this.state.currentIndex = this.state.shuffle ? Math.floor(Math.random() * this.state.queue.length) : (this.state.currentIndex + 1) % this.state.queue.length;
        this.play(this.state.queue[this.state.currentIndex], this.state.currentIndex);
    }

    playPrev() {
        if (!this.state.queue?.length) return;
        this.state.currentIndex = this.state.shuffle ? Math.floor(Math.random() * this.state.queue.length) : (this.state.currentIndex - 1 + this.state.queue.length) % this.state.queue.length;
        this.play(this.state.queue[this.state.currentIndex], this.state.currentIndex);
    }

    setQueue(songs) {
        this.state.queue = Array.isArray(songs) ? songs.slice() : [];
        this.state.currentIndex = -1;
        console.log(`[player] Queue set with ${this.state.queue.length} songs`);
    }
}

// PlayerUI class to handle UI creation and event setup
class PlayerUI {
    constructor(container, state, audioPlayer) {
        this.container = container;
        this.state = state;
        this.audioPlayer = audioPlayer;
        this.footer = null;
        this.audio = null;
        this.progressBar = null;
        this.volumeSlider = null;
        this.repeatBtn = null;
        this.shuffleBtn = null;
    }

    _createAudioElement() {
        this.audio = createElement("audio", { id: "songs-audio" });
        this.audio.volume = this.state.volume;
        this.state.audio = this.audio;
        return this.audio;
    }

    _createControls() {
        const prevBtn = createElement("button", { class: "prev-btn" }, ["⏮"]);
        const playBtn = createElement("button", { class: "play-btn" }, ["▶"]);
        const pauseBtn = createElement("button", { class: "pause-btn" }, ["⏸"]);
        const nextBtn = createElement("button", { class: "next-btn" }, ["⏭"]);

        this.repeatBtn = createElement("button", { class: "repeat-btn" }, [REPEAT_TEXT]);
        this.shuffleBtn = createElement("button", { class: "shuffle-btn" }, [SHUFFLE_TEXT]);
        this.volumeSlider = createElement("input", { type: "range", min: VOLUME_MIN, max: VOLUME_MAX, step: VOLUME_STEP, value: this.state.volume });
        this.progressBar = createElement("input", { type: "range", min: 0, max: PROGRESS_BAR_MAX, step: PROGRESS_BAR_STEP, value: 0, class: "progress-bar" });

        return { prevBtn, playBtn, pauseBtn, nextBtn };
    }

    _setupEventListeners(audio, prevBtn, playBtn, pauseBtn, nextBtn) {
        prevBtn.addEventListener("click", () => this.audioPlayer.playPrev());
        nextBtn.addEventListener("click", () => this.audioPlayer.playNext());
        playBtn.addEventListener("click", () => { if (audio.src) audio.play(); });
        pauseBtn.addEventListener("click", () => { if (audio.src) audio.pause(); });

        this.repeatBtn.addEventListener("click", () => {
            const currentIndex = REPEAT_MODES.indexOf(this.state.repeat);
            this.state.repeat = REPEAT_MODES[(currentIndex + 1) % REPEAT_MODES.length];
            console.log(`[player] Repeat mode: ${this.state.repeat}`);
            Notify(`Repeat mode: ${this.state.repeat}`);
        });

        this.shuffleBtn.addEventListener("click", () => {
            this.state.shuffle = !this.state.shuffle;
            this.shuffleBtn.classList.toggle("active", this.state.shuffle);
            console.log(`[player] Shuffle: ${this.state.shuffle}`);
            Notify(`Shuffle: ${this.state.shuffle ? "ON" : "OFF"}`);
        });

        this.volumeSlider.addEventListener("input", () => {
            audio.volume = Number(this.volumeSlider.value);
            this.state.volume = audio.volume;
        });

        audio.addEventListener("timeupdate", () => {
            this.progressBar.value = (audio.currentTime / audio.duration) * PROGRESS_BAR_MAX || 0;
        });

        this.progressBar.addEventListener("input", () => {
            audio.currentTime = (this.progressBar.value / PROGRESS_BAR_MAX) * audio.duration;
        });

        audio.addEventListener("ended", () => {
            if (this.state.repeat === "one") {
                const cur = this.state.queue[this.state.currentIndex];
                if (cur) this.audioPlayer.play(cur, this.state.currentIndex, 0);
            } else this.audioPlayer.playNext();
        });

        // update UI when metadata loads (duration)
        audio.addEventListener("loadedmetadata", () => {
            const cur = this.state.currentSong;
            if (cur) {
                // update matching song-row meta to show duration if missing
                const content = getContentContainer(this.container);
                const row = content.querySelector(`.song-row[data-songid="${cur.songid}"]`);
                if (row) {
                    const metaEl = row.querySelector(".song-meta");
                    if (metaEl) {
                        const minutes = Math.floor(audio.duration / 60);
                        const seconds = Math.floor(audio.duration % 60).toString().padStart(2, "0");
                        // replace children safely
                        while (metaEl.firstChild) metaEl.removeChild(metaEl.firstChild);
                        metaEl.append(createElement("span", {}, [`${cur.genre || ""} • ${minutes}:${seconds}`]));
                    }
                }
            }
        });
    }

    _createFooter() {
        this.footer = this.container.querySelector(".songs-footer");
        if (this.footer) {
            const audio = this.footer.querySelector("#songs-audio");
            if (audio) this.state.audio = audio;
            return;
        }

        let playcon = createElement("div", { "class": "playcon" }, []);
        let progresscon = createElement("div", { "class": "progresscon" }, []);
        let volumecon = createElement("div", { "class": "volumecon" }, []);

        this.footer = createElement("footer", { class: "songs-footer hvflex" });
        const audio = this._createAudioElement();
        const { prevBtn, playBtn, pauseBtn, nextBtn } = this._createControls();

        // footer.append(prevBtn, playBtn, pauseBtn, nextBtn, repeatBtn, shuffleBtn, volumeSlider, progressBar, audio);
        playcon.append(prevBtn, playBtn, pauseBtn, nextBtn);
        progresscon.append(this.repeatBtn, this.shuffleBtn, this.progressBar, audio);
        volumecon.append(this.volumeSlider);
        this.footer.append(volumecon, playcon, progresscon);
        this.container.append(this.footer);

        this._setupEventListeners(audio, prevBtn, playBtn, pauseBtn, nextBtn);
    }
}

import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";
import { getContentContainer } from "./uiHelpers.js";

// ------------------------ Player (encapsulated) ------------------------
let activePlayer = null; // tracks most recent player

class Player {
    constructor(container) {
        this.container = container;
        this.state = new PlayerState();
        this.audioPlayer = new AudioPlayer(this.state);
        this.ui = new PlayerUI(container, this.state, this.audioPlayer);

        // create footer & audio once
        this.ui._createFooter();
        // wire keyboard activation via global activePlayer handled below
    }

    async play(song, idx = undefined, startTime = 0) {
        return this.audioPlayer.play(song, idx, startTime);
    }

    playNext() {
        this.audioPlayer.playNext();
    }

    playPrev() {
        this.audioPlayer.playPrev();
    }

    setQueue(songs) {
        this.audioPlayer.setQueue(songs);
    }

    reset() {
        this.state.reset();
        if (this.state.audio) this.state.audio.pause();
        console.log("[player] Reset");
    }

    getState() {
        return this.state.getState();
    }
}

export function initPlayer(container) {
    const player = new Player(container);
    activePlayer = {
        play: (song, idx, startTime) => { player.play(song, idx, startTime); activePlayer = activePlayer; },
        setQueue: (songs) => player.setQueue(songs),
        playNext: () => player.playNext(),
        playPrev: () => player.playPrev(),
        reset: () => player.reset(),
        getState: () => player.getState()
    };
    // assign activePlayer to the real Player instance for global keyboard handler compatibility
    activePlayer._playerInstance = player;
    return activePlayer;
}

// Keyboard shortcuts (global)
document.addEventListener("keydown", (e) => {
    if (!activePlayer) return;
    const st = activePlayer.getState();
    if (!st || !st.audio) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.code === "Space") { e.preventDefault(); st.audio.paused ? st.audio.play() : st.audio.pause(); }
    if (e.code === "ArrowRight") activePlayer.playNext();
    if (e.code === "ArrowLeft") activePlayer.playPrev();
});
