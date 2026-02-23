import { createControls } from "./controls.js";
import { setupSubtitles } from "./subtitles.js";

/**
 * Generates a video player with quality selection, subtitles, and advanced controls.
 */
async function generateVideoPlayer(mediaSrc, poster, qualities, subtitles, videoid) {
  const videoPlayer = document.createElement("div");
  videoPlayer.id = "video-player";

  const video = document.createElement("video");
  video.id = "main-video";
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.poster = poster;
  // video.controls = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";

  /** === HANDLE VIDEO QUALITY SELECTION === **/
  if (qualities.length !== 0) {
    const storedQuality = localStorage.getItem("videoQuality") || "144p";
    const defaultQuality = qualities.find(q => q.label === storedQuality) || qualities[0];

    console.log("Available Qualities:", qualities);
    console.log("Selected Quality:", storedQuality);

    video.src = defaultQuality.src;
    video.setAttribute("data-quality", defaultQuality.label);

    // Append alternative quality sources
    qualities.forEach(quality => {
      const source = document.createElement("source");
      source.src = quality.src;
      source.type = "video/mp4";
      source.setAttribute("data-quality", quality.label);
      video.appendChild(source);
    });
  } else {
    video.src = mediaSrc;
  }

  video.appendChild(document.createTextNode("Your browser does not support the video tag."));

  /** === HANDLE SUBTITLES === **/
  if (subtitles.length !== 0) {
    const subtitleContainer = document.createElement("div");
    subtitleContainer.className = "subtitle-container";
    videoPlayer.appendChild(subtitleContainer);

    await setupSubtitles(video, subtitles, subtitleContainer);
  }

  /** === VIDEO CONTROLS === **/
  const controls = createControls(video, mediaSrc, qualities, videoid, videoPlayer);
  videoPlayer.appendChild(video);
  videoPlayer.appendChild(controls);

  /** === PROGRESS BAR LOGIC === **/
  const progressBar = controls.querySelector(".progress-bar");
  const progress = controls.querySelector(".progress");

  let isDragging = false;

  function updateProgressBar() {
    if (!isDragging && !isNaN(video.duration)) {
      progress.style.width = `${(video.currentTime / video.duration) * 100}%`;
    }
  }

  video.addEventListener("timeupdate", updateProgressBar);

  function seekVideo(event) {
    const rect = progressBar.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = video.duration * fraction;
    progress.style.width = `${fraction * 100}%`;
  }

  progressBar.addEventListener("mousedown", (event) => {
    isDragging = true;
    seekVideo(event);
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      seekVideo(event);
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
    }
  });

  /** === TOGGLE PLAY/PAUSE ON CLICK === **/
  video.addEventListener("click", () => (video.paused ? video.play() : video.pause()));

  /** === HANDLE QUALITY SWITCHING WITHOUT RELOADING === **/
  if (qualities.length !== 0) {
    controls.querySelector(".quality-selector").addEventListener("change", (event) => {
      const selectedQualityLabel = event.target.value;
      const selectedQuality = qualities.find(q => q.label === selectedQualityLabel);

      if (!selectedQuality || selectedQuality.src === video.src) return;

      console.log("Switching to quality:", selectedQuality.label);

      // Save preference
      localStorage.setItem("videoQuality", selectedQuality.label);

      // Preserve playback state
      const currentTime = video.currentTime;
      const isPaused = video.paused;

      // Switch source dynamically
      video.src = selectedQuality.src;
      video.setAttribute("data-quality", selectedQuality.label);

      video.addEventListener("loadedmetadata", () => {
        video.currentTime = currentTime;
        if (!isPaused) video.play();
      }, { once: true });
    });
  }

  /** === HANDLE FULLSCREEN ROTATION ON MOBILE === **/
  videoPlayer.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === videoPlayer) {
      if (isMobile() && video.videoWidth > video.videoHeight) {
        lockOrientation("landscape");
      }
    } else {
      if (isMobile()) unlockOrientation();
    }
  });

  return videoPlayer;
}

/** =================== ORIENTATION LOGIC =================== **/

/**
 * Detects if the user is on a mobile device.
 * @returns {boolean}
 */
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Locks the screen orientation (only works inside fullscreen).
 * @param {string} orientation - "landscape" or "portrait"
 */
function lockOrientation(orientation) {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock(orientation).catch(err => console.warn("Orientation lock failed:", err));
  }
}

/**
 * Unlocks screen orientation.
 */
function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
}

export { generateVideoPlayer };
