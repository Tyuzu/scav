import "../../../css/ui/MinAudio.css";
import {pauseSVG, playSVG} from "../svgs.js";
import {createElement} from "../createElement.js";
import Imagex from "../base/Imagex.js";

function MinAudio(audioSrc) {
  const player = document.createElement("div");
  player.className = "mini-audio";

  const thumbnailWrapper = document.createElement("div");
  thumbnailWrapper.className = "thumbnail-wrapper";

  const poster = Imagex({src:audioSrc.poster || ""});
  poster.alt = "Audio Poster";
  poster.className = "audio-thumbnail";

  const overlayIcon = document.createElement("div");
  overlayIcon.className = "overlay-icon";
  overlayIcon.innerHTML = `${playSVG}`;

  const audio = document.createElement("audio");
  audio.src = audioSrc.audioUrl;
  audio.preload = "metadata";

  poster.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      overlayIcon.innerHTML = `${pauseSVG}`;
    } else {
      audio.pause();
      overlayIcon.innerHTML = `${playSVG}`;
    }
  });

  thumbnailWrapper.append(poster, overlayIcon, audio);

  const seekBar = document.createElement("input");
  seekBar.type = "range";
  seekBar.className = "seek-bar";
  seekBar.min = 0;
  seekBar.max = 100;
  seekBar.value = 0;

  const timeDisplay = document.createElement("div");
  timeDisplay.className = "time-display";

  const currentTime = document.createElement("span");
  currentTime.className = "current-time";
  currentTime.textContent = "00:00";

  const durationTime = document.createElement("span");
  durationTime.className = "duration-time";
  durationTime.textContent = "00:00";

  timeDisplay.append(currentTime, durationTime);

  audio.addEventListener("loadedmetadata", () => {
    durationTime.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    seekBar.value = progress;
    currentTime.textContent = formatTime(audio.currentTime);
  });

  seekBar.addEventListener("input", () => {
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  });

  const controls = document.createElement("div");
  controls.className = "controls vflex";

  const muteBtn = document.createElement("button");
  muteBtn.className = "btn mute-btn";
  muteBtn.innerHTML = "🔊";

  muteBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    muteBtn.innerHTML = audio.muted ? "🔇" : "🔊";
  });

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.className = "volume-slider";
  volumeSlider.min = 0;
  volumeSlider.max = 1;
  volumeSlider.step = 0.05;
  volumeSlider.value = audio.volume;

  volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value;
    muteBtn.innerHTML = audio.volume == 0 ? "🔇" : "🔊";
  });

  const speedControl = document.createElement("select");
  speedControl.className = "speed-select";
  [0.5, 1, 1.5, 2].forEach((rate) => {
    const opt = document.createElement("option");
    opt.value = rate;
    opt.textContent = `${rate}x`;
    if (rate === 1) opt.selected = true;
    speedControl.appendChild(opt);
  });

  speedControl.addEventListener("change", () => {
    audio.playbackRate = parseFloat(speedControl.value);
  });

  const loopBtn = document.createElement("button");
  loopBtn.className = "btn loop-btn";
  loopBtn.innerHTML = "🔁";

  loopBtn.addEventListener("click", () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle("active");
  });

  const volcon = createElement('div',{"class":"hflex"});
  const loopcon = createElement('div',{"class":"hflex"});

  volcon.append(muteBtn, volumeSlider);
  loopcon.append(speedControl, loopBtn);
  controls.append(volcon, loopcon);

  player.append(thumbnailWrapper, seekBar, timeDisplay, controls);
  return player;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default MinAudio;
