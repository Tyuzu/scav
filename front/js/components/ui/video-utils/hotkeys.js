import {
  changeZoom,
  flipVideo,
  rotateVideo,
  resetRotation,
  updateTransform
} from "./gestureHandlers.js";
import {
  setVolume,
  toggleMute,
  resetSpeed,
  slower,
  faster
} from "./volumeSpeedControls.js";
import {
  togglePictureInPicture,
  toggleFullScreen,
  subtitles
} from "../vidpopHelpers/vutils.js";

export function setupHotkeys(video) {
  const isInput = (el) => ["INPUT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable;

  const actions = {
    "h": () => flipVideo(video),
    "+": () => changeZoom(-1, null, video),
    "-": () => changeZoom(1, null, video),
    "c": () => faster(video),
    "x": () => resetSpeed(video),
    "z": () => slower(video),
    "b": () => setVolume(video, -0.1),
    "n": () => setVolume(video, 0.1),
    "m": () => toggleMute(video),
    "v": () => video.paused ? video.play() : video.pause(),
    ",": () => video.currentTime = Math.max(0, video.currentTime - 1 / 12),
    ".": () => video.currentTime = Math.min(video.duration, video.currentTime + 1 / 12),
    "f": () => toggleFullScreen(video),
    "k": () => video.paused ? video.play() : video.pause(),
    "j": () => video.currentTime = Math.max(0, video.currentTime - 10),
    "l": () => video.currentTime = Math.min(video.duration, video.currentTime + 10),
    "r": () => rotateVideo(video),
    "Alt+r": () => resetRotation(video),
    "Shift+ArrowUp": () => setVolume(video, 0.1),
    "Shift+ArrowDown": () => setVolume(video, -0.1),
    "Ctrl+ArrowLeft": () => video.currentTime -= 5,
    "Ctrl+ArrowRight": () => video.currentTime += 5,
    "s": () => subtitles(video),
    "p": () => togglePictureInPicture(video),
  };

  // Add digit keys for percentage seeking
  for (let i = 0; i <= 9; i++) {
    actions[String(i)] = () => video.currentTime = video.duration * (i / 10);
  }

  window.addEventListener("keydown", async (e) => {
    if (isInput(e.target)) return;

    const combo = [
      e.ctrlKey && "Ctrl",
      e.shiftKey && "Shift",
      e.altKey && "Alt",
      e.key.length === 1 ? e.key : e.code,
    ].filter(Boolean).join("+");

    const action = actions[combo] || actions[e.key];
    if (action) {
      await action(); // handle async (e.g., PiP)
      if (!["m", "v"].includes(e.key)) updateTransform(video);
      e.preventDefault();
    }
  });

}
