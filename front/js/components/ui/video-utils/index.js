import { setupHotkeys } from "./hotkeys.js";
import { setupGestures } from "./gestureHandlers.js";
import { saveVideoProgress } from "./progressSaver.js";

export function setupVideoUtilityFunctions(video, videoid) {
  setupGestures(video);
  setupHotkeys(video);

  if (videoid) {
    saveVideoProgress(video, videoid);
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    (video.parentElement || document.body).classList.add("dark-mode");
  }
}
