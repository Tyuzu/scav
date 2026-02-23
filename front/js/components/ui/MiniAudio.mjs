import "../../../css/ui/MiniAudio.css";
import { pauseSVG, playSVG } from "../svgs.js";
import { createElement } from "../createElement.js";
import Imagex from "../base/Imagex.js";

function MiniAudio({ poster, audioUrl, title = "" }) {
  const player = createElement("div", { class: "mini-audio horizontal" });

  const playBtn = createElement("button", { class: "play-btn" });
  playBtn.innerHTML = playSVG;

  let audio = null; // Audio will be created lazily
  let isLoaded = false;

  const seekBar = createElement("input", {
    type: "range",
    class: "seek-bar",
    min: 0,
    max: 100,
    value: 0,
  });

  const timeDisplay = createElement("span", { class: "time" }, ["00:00"]);

  function initAudio() {
    if (isLoaded) return;
    audio = new Audio(audioUrl);
    audio.preload = "none";
    isLoaded = true;

    audio.addEventListener("loadedmetadata", () => {
      timeDisplay.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;
      seekBar.value = (audio.currentTime / audio.duration) * 100;
    });

    seekBar.addEventListener("input", () => {
      if (audio.duration) {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
      }
    });
  }

  playBtn.addEventListener("click", () => {
    if (!isLoaded) initAudio();

    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = pauseSVG;
    } else {
      audio.pause();
      playBtn.innerHTML = playSVG;
    }
  });

  const posterImg = Imagex( {
    src: poster || "",
    alt: "Poster",
    classes: "mini-poster",
  });

  const titleText = createElement("span", { class: "audio-title" }, [title]);

  const left = createElement("div", { class: "left" }, [playBtn, posterImg]);
  const center = createElement("div", { class: "center" }, [titleText, seekBar]);
  const right = createElement("div", { class: "right" }, [timeDisplay]);

  player.append(left, center, right);
  return player;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default MiniAudio;
