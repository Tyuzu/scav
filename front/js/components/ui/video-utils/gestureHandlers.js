let isDragging = false, startX = 0, startY = 0;
let zoomLevel = 1, panX = 0, panY = 0, angle = 0, flip = false;
const minZoom = 1, maxZoom = 8;

const updateTransform = (video) => {
  video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${flip ? "scaleX(-1)" : ""}`;
};

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

const constrainPan = (video) => {
  const rect = video.getBoundingClientRect();
  const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
  const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
};

const flipVideo = (video) => {
  flip = !flip;
  updateTransform(video);
};

const rotateVideo = (video, degrees = 90) => {
  angle = (angle + degrees) % 360;
  video.style.width = "100vh";
  updateTransform(video);
};

const resetRotation = (video) => {
  angle = 0;
  video.style.width = "";
  updateTransform(video);
};

export {
  changeZoom,
  updateTransform,
  flipVideo,
  rotateVideo,
  resetRotation,
  constrainPan,
};

export function setupGestures(video) {
  const onWheel = (e) => {
    e.preventDefault();
    changeZoom(e.deltaY, e, video);
  };

  const onMouseDown = (e) => {
    if (zoomLevel === 1) return; // nothing to drag at scale 1
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - panX;  // use global panX
    startY = e.clientY - panY;  // use global panY
    document.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;  // update global panX
    panY = e.clientY - startY;  // update global panY
    constrainPan(video);
    updateTransform(video);
  };

  const onMouseUp = () => isDragging = false;

  video.addEventListener("wheel", onWheel, { passive: false });
  video.addEventListener("mousedown", onMouseDown);
  video.addEventListener("mousemove", onMouseMove);
  video.addEventListener("mouseup", onMouseUp);
  video.addEventListener("mouseleave", onMouseUp);

  setupTouch(video);
}

function setupTouch(video) {
  video.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
      isDragging = true;
      startX = event.touches[0].clientX - panX; // use global
      startY = event.touches[0].clientY - panY;
    }
  }, { passive: false });

  video.addEventListener("touchmove", (event) => {
    if (!isDragging || event.touches.length !== 1) return;
    panX = event.touches[0].clientX - startX;
    panY = event.touches[0].clientY - startY;
    constrainPan(video);
    updateTransform(video);
  }, { passive: false });

  video.addEventListener("touchend", () => isDragging = false);
}

