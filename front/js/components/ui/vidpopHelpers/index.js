import "../../../../css/ui/Vidpop.css";
import { createControls } from "./controls.js";
import { setupSubtitles } from "./subtitles.js";
import { createVideoElement } from "./createVideo.js";
import { setupQualitySwitch } from "./setupQualitySwitch.js";
import { setupProgress } from "./setupProgress.js";
import { setupFullscreenOrientation } from "./setupOrientation.js";
import { setupVideoUtilityFunctions } from "../video-utils/index.js";
import { setupVideoContextMenu } from "./videoContextMenu.js";

// ---- Core Setup Helpers ----
export function setupClickToPlay(video) {
  const handler = () => (video.paused ? video.play() : video.pause());
  video.addEventListener("click", handler);

  // Return cleanup so callers can remove listener if needed
  return () => video.removeEventListener("click", handler);
}

export async function setupSubtitleTrack(video, subtitles, container) {
  if (!subtitles || subtitles.length === 0) return null;
  await setupSubtitles(video, subtitles, container);
  return container;
}

export function setupControlBar(video, mediaSrc, qualities, videoid, container) {
  return createControls(video, mediaSrc, qualities, videoid, container);
}

export function setupVideoProgress(video, controls) {
  const progressBar = controls.querySelector(".progress-bar");
  const progress = controls.querySelector(".progress");
  setupProgress(video, progressBar, progress);
}

export function setupQualitySelector(video, qualities, controls) {
  const qualitySelector = controls.querySelector(".quality-selector");
  if (qualitySelector) {
    setupQualitySwitch(video, qualities, qualitySelector);
  }
}

export function setupFullscreen(videoPlayer, video) {
  setupFullscreenOrientation(videoPlayer, video);
}

// ---- Main Generator (uses all helpers) ----
export async function generateVideoPlayer(mediaSrc, poster, qualities, subtitles, videoid) {
  const videoPlayer = document.createElement("div");
  videoPlayer.id = "video-player";

  // Video element
  const video = createVideoElement({ mediaSrc, poster, qualities });

  // Subtitles
  if (subtitles.length !== 0) {
    const subtitleContainer = document.createElement("div");
    subtitleContainer.className = "subtitle-container";
    videoPlayer.appendChild(subtitleContainer);
    await setupSubtitleTrack(video, subtitles, subtitleContainer);
  }

  // Controls
  const controls = setupControlBar(video, mediaSrc, qualities, videoid, videoPlayer);

  // Utilities
  setupVideoUtilityFunctions(video, videoid);
  setupVideoContextMenu(video);

  // Append
  videoPlayer.appendChild(video);
  videoPlayer.appendChild(controls);

  // Progress
  setupVideoProgress(video, controls);

  // Click-to-play
  setupClickToPlay(video);

  // Quality selector
  setupQualitySelector(video, qualities, controls);

  // Fullscreen
  setupFullscreen(videoPlayer, video);

  return videoPlayer;
}
