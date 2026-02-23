import "../../../css/ui/AudioPlayer.css";
import Imagex from "../base/Imagex";

function AudioPlayer(audioSrc) {
  const player = document.createElement("div");
  player.id = "audio-player-container";
  player.classList.add("mini-mode");
  player.setAttribute("role", "region");
  player.setAttribute("aria-label", "Audio Player");

  // === POSTER IMAGE ===
  const img = Imagex({ src: audioSrc.poster || "" });
  img.alt = "Audio Thumbnail";
  img.className = "audio-poster";

  // === AUDIO ELEMENT ===
  const audio = document.createElement("audio");
  audio.src = audioSrc.src;
  audio.controls = false;
  audio.preload = "metadata";
  audio.playbackRate = 1;

  // === CONTROLS CONTAINER ===
  const controlsContainer = document.createElement("div");
  controlsContainer.className = "controls-container";

  // Play / Pause
  const playButton = document.createElement("button");
  playButton.textContent = "Play";
  playButton.onclick = () => {
    if (audio.paused) {
      audio.play();
      playButton.textContent = "Pause";
    } else {
      audio.pause();
      playButton.textContent = "Play";
    }
  };

  // Mute / Unmute
  const muteButton = document.createElement("button");
  muteButton.textContent = "Mute";
  muteButton.onclick = () => {
    audio.muted = !audio.muted;
    muteButton.textContent = audio.muted ? "Unmute" : "Mute";
  };

  // Seek bar
  const seekBar = document.createElement("input");
  seekBar.type = "range";
  seekBar.min = 0;
  seekBar.max = 100;
  seekBar.value = 0;
  seekBar.className = "seek-bar";

  audio.addEventListener("timeupdate", () => {
    if (!isNaN(audio.duration)) {
      seekBar.value = (audio.currentTime / audio.duration) * 100;
    }
    updateTimeDisplay();
  });

  seekBar.addEventListener("input", () => {
    if (!isNaN(audio.duration)) {
      audio.currentTime = (seekBar.value / 100) * audio.duration;
    }
  });

  // Volume
  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = 0;
  volumeSlider.max = 1;
  volumeSlider.step = 0.1;
  volumeSlider.value = audio.volume;
  volumeSlider.className = "volume-slider";
  volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value;
  });

  // Speed
  const speedSelect = document.createElement("select");
  [0.5, 1, 1.5, 2].forEach((speed) => {
    const option = document.createElement("option");
    option.value = speed;
    option.textContent = `${speed}x`;
    speedSelect.appendChild(option);
  });
  speedSelect.value = "1";
  speedSelect.className = "speed-select";
  speedSelect.addEventListener("change", () => {
    audio.playbackRate = parseFloat(speedSelect.value);
  });

  // Time Display
  const timeDisplay = document.createElement("span");
  timeDisplay.className = "time-display";
  timeDisplay.textContent = "00:00 / 00:00";

  const updateTimeDisplay = () => {
    const format = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m.toString().padStart(2, "0")}:${sec
        .toString()
        .padStart(2, "0")}`;
    };
    if (!isNaN(audio.duration)) {
      timeDisplay.textContent = `${format(audio.currentTime)} / ${format(
        audio.duration
      )}`;
    }
  };

  // Buffering Indicator
  const bufferingIndicator = document.createElement("span");
  bufferingIndicator.className = "buffering-indicator";
  bufferingIndicator.textContent = "Loading...";
  bufferingIndicator.style.display = "none";

  audio.addEventListener("waiting", () => {
    bufferingIndicator.style.display = "inline-block";
  });

  audio.addEventListener("playing", () => {
    bufferingIndicator.style.display = "none";
  });

  audio.addEventListener("seeking", () => {
    bufferingIndicator.style.display = "inline-block";
  });

  audio.addEventListener("seeked", () => {
    bufferingIndicator.style.display = "none";
  });

  controlsContainer.appendChild(playButton);
  controlsContainer.appendChild(muteButton);
  controlsContainer.appendChild(seekBar);
  controlsContainer.appendChild(timeDisplay);
  controlsContainer.appendChild(bufferingIndicator);
  controlsContainer.appendChild(volumeSlider);
  controlsContainer.appendChild(speedSelect);

  // === LYRICS ===
  const lyricsContainer = document.createElement("div");
  lyricsContainer.id = "lyrics-container";

  if (Array.isArray(audioSrc.lyricsData)) {
    audioSrc.lyricsData.forEach((lyric) => {
      const p = document.createElement("p");
      p.textContent = lyric.text;
      p.dataset.time = lyric.time;
      lyricsContainer.appendChild(p);
    });
  }

  function updateLyrics() {
    const t = audio.currentTime;
    const lines = lyricsContainer.querySelectorAll("p");
    lines.forEach((el) => {
      const tm = parseFloat(el.dataset.time);
      el.classList.toggle("active", t >= tm);
    });
    const active = lyricsContainer.querySelector("p.active");
    if (active) active.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  audio.addEventListener("timeupdate", updateLyrics);

  // === DARK MODE TOGGLE ===
  const themeToggle = document.createElement("button");
  themeToggle.textContent = "🌙 Dark Mode";
  themeToggle.className = "theme-toggle";
  themeToggle.onclick = () => {
    player.classList.toggle("dark-mode");
    themeToggle.textContent = player.classList.contains("dark-mode")
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";
  };

  // === APPEND ALL ===
  player.appendChild(img);
  player.appendChild(audio);
  player.appendChild(controlsContainer);
  player.appendChild(lyricsContainer);
  player.appendChild(themeToggle);

  return player;
}

export default AudioPlayer;
export { AudioPlayer };
