// videoUtils.js
import { setupHotkeys } from "./hotkeys.js";
import { saveVideoProgress } from "./progressSaver.js";

// --- Global transform state ---
let zoomLevel = 1, panX = 0, panY = 0, angle = 0, flip = false;
const minZoom = 1, maxZoom = 8;
let isDragging = false, startX = 0, startY = 0;

// --- Transform update ---
const updateTransform = (video) => {
  video.style.transform = `
    translate(${panX}px, ${panY}px)
    scale(${zoomLevel})
    rotate(${angle}deg)
    ${flip ? "scaleX(-1)" : ""}
  `;
};

// --- Constrain pan ---
const constrainPan = (video) => {
  const rect = video.getBoundingClientRect();
  const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
  const maxPanY = (rect.height * (zoomLevel - 1)) / 2;
  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
};

// --- Zoom function ---
const changeZoom = (delta, event, video) => {
  const rect = video.getBoundingClientRect();
  const cursorX = event ? event.clientX - rect.left : rect.width / 2;
  const cursorY = event ? event.clientY - rect.top : rect.height / 2;
  const prevZoom = zoomLevel;

  zoomLevel *= delta > 0 ? 0.95 : 1.05;
  zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
  const zoomFactor = zoomLevel / prevZoom;

  panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
  panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);
  constrainPan(video);
  updateTransform(video);
};

// --- Flip & rotate ---
const flipVideo = (video) => { flip = !flip; updateTransform(video); };
const rotateVideo = (video, deg = 90) => { angle = (angle + deg) % 360; updateTransform(video); };
const resetRotation = (video) => { angle = 0; updateTransform(video); };

// --- Gesture handlers ---
const setupGestures = (video) => {
  // Mouse wheel zoom
  video.addEventListener("wheel", (e) => {
    e.preventDefault();
    changeZoom(e.deltaY, e, video);
  }, { passive: false });

  // Mouse drag
  const onMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    document.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    constrainPan(video);
    updateTransform(video);
  };

  const onMouseUp = () => {
    isDragging = false;
    document.body.style.cursor = "";
  };

  video.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  // Touch drag & pinch
  let initialDistance = 0, initialZoom = zoomLevel;
  video.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      initialDistance = getDistance(e.touches[0], e.touches[1]);
      initialZoom = zoomLevel;
    }
  }, { passive: false });

  video.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && isDragging) {
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      constrainPan(video);
      updateTransform(video);
    } else if (e.touches.length === 2) {
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, initialZoom * (newDistance / initialDistance)));
      constrainPan(video);
      updateTransform(video);
    }
  }, { passive: false });

  video.addEventListener("touchend", () => { isDragging = false; });
};

// --- Utils ---
const getDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.hypot(dx, dy);
};

// --- Setup function ---
export function setupVideoUtilityFunctions(video, videoid) {
  setupGestures(video);     // drag + pinch + wheel zoom
  setupHotkeys(video);      // hotkeys

  if (videoid) { saveVideoProgress(video, videoid); } // save progress

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    (video.parentElement || document.body).classList.add("dark-mode");
  }
}

export {
  changeZoom,
  updateTransform,
  flipVideo,
  rotateVideo,
  resetRotation,
  constrainPan,
};

// import { setupHotkeys } from "./hotkeys.js";
// import { setupGestures } from "./gestureHandlers.js";
// import { changeZoom } from "./transformController.js";
// import { saveVideoProgress } from "./progressSaver.js";

// export function setupVideoUtilityFunctions(video, videoid) {
//   setupGestures(video, changeZoom);
//   setupHotkeys(video);

//   if (videoid) {
//     saveVideoProgress(video, videoid);
//   }

//   if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
//     (video.parentElement || document.body).classList.add("dark-mode");
//   }
// }
