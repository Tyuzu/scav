import Imagex from "../base/Imagex";
import { createElement } from "../../components/createElement";

// === ZOOMABLE MEDIA FACTORY ===
export const createZoomableMedia = (src, type = "image") => {
  const state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    velocityX: 0,
    velocityY: 0,
    lastMoveX: 0,
    lastMoveY: 0,
    momentum: false,
    pinchDistance: 0,
    zoomLevels: [1, 1.5, 2, 3, 5, 7],
    zoomIndex: 0,
  };

  const zoomLabel = createElement("div", { class: "zoom-label" }, [
    document.createTextNode("Zoom: 1.0x")
  ]);

  const resetZoomBtn = createElement("button", { 
    class: "reset-zoom-btn", 
    events: { click: () => {
      state.scale = 1;
      state.offsetX = 0;
      state.offsetY = 0;
      state.zoomIndex = 0;
      applyTransform(true);
    }}
  }, [document.createTextNode("Reset Zoom")]);

  let mediaEl;
  if (type === "image") {
    mediaEl = Imagex({
      src: src,
      alt: "Zoomable Image",
      classes: "zoomable-image",
    });
  } else if (type === "video") {
    mediaEl = createElement("video", { 
      src: src, 
      controls: true, 
      class: "zoomable-image" 
    });
  }

  const container = createElement("div", { class: "zoom-container" }, [
    mediaEl,
    zoomLabel,
    resetZoomBtn
  ]);

  // === Core Logic ===
  let lastTap = 0;

  mediaEl.addEventListener("load", () => applyTransform(true));
  if (type === "video") {
    mediaEl.addEventListener("loadedmetadata", () => applyTransform(true));
  }

  mediaEl.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      state.zoomIndex = (state.zoomIndex + 1) % state.zoomLevels.length;
      state.scale = state.zoomLevels[state.zoomIndex];
      applyTransform(true);
    }
    lastTap = now;
  });

  mediaEl.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      state.isPinching = true;
      state.pinchDistance = getPinchDistance(e.touches);
    } else if (state.scale > 1) {
      state.isDragging = true;
      state.startX = e.touches[0].clientX - state.offsetX;
      state.startY = e.touches[0].clientY - state.offsetY;
      state.velocityX = 0;
      state.velocityY = 0;
      state.lastMoveX = e.touches[0].clientX;
      state.lastMoveY = e.touches[0].clientY;
      state.momentum = false;
    }
  });

  const onTouchMove = (e) => {
    if (state.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDist = getPinchDistance(e.touches);
      const scaleChange = newDist / state.pinchDistance;
      state.scale = Math.max(1, Math.min(7, state.scale * scaleChange));
      state.pinchDistance = newDist;
      applyTransform();
    } else if (state.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      state.velocityX = x - state.lastMoveX;
      state.velocityY = y - state.lastMoveY;
      state.lastMoveX = x;
      state.lastMoveY = y;
      state.offsetX = x - state.startX;
      state.offsetY = y - state.startY;
      applyTransform();
    }
  };
  mediaEl.addEventListener("touchmove", onTouchMove, { passive: false });

  mediaEl.addEventListener("touchend", () => {
    if (state.isDragging) {
      state.isDragging = false;
      if (Math.abs(state.velocityX) > 5 || Math.abs(state.velocityY) > 5) {
        state.momentum = true;
        requestAnimationFrame(momentumScroll);
      }
    }
    state.isPinching = false;
    applyTransform(true);
  });

  // === Desktop support ===
  const onMouseMove = (e) => {
    if (state.isDragging) {
      state.velocityX = e.clientX - state.lastMoveX;
      state.velocityY = e.clientY - state.lastMoveY;
      state.lastMoveX = e.clientX;
      state.lastMoveY = e.clientY;
      state.offsetX = e.clientX - state.startX;
      state.offsetY = e.clientY - state.startY;
      applyTransform();
    }
  };

  const onMouseUp = () => {
    if (state.isDragging) {
      state.isDragging = false;
      if (Math.abs(state.velocityX) > 5 || Math.abs(state.velocityY) > 5) {
        state.momentum = true;
        requestAnimationFrame(momentumScroll);
      }
    }
  };

  mediaEl.addEventListener("mousedown", (e) => {
    if (state.scale > 1) {
      state.isDragging = true;
      state.startX = e.clientX - state.offsetX;
      state.startY = e.clientY - state.offsetY;
      state.velocityX = 0;
      state.velocityY = 0;
      state.lastMoveX = e.clientX;
      state.lastMoveY = e.clientY;
      state.momentum = false;
      e.preventDefault();
    }
  });

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  // === Wheel Zoom ===
  mediaEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    state.scale = Math.max(1, Math.min(7, state.scale + delta));
    applyTransform(true);
  });

  // === Helpers ===
  function applyTransform(snap = false) {
    const width = mediaEl.offsetWidth || 1;
    const height = mediaEl.offsetHeight || 1;
    const limitX = (width * (state.scale - 1)) / 2;
    const limitY = (height * (state.scale - 1)) / 2;

    if (snap) {
      state.offsetX = Math.max(-limitX, Math.min(limitX, state.offsetX));
      state.offsetY = Math.max(-limitY, Math.min(limitY, state.offsetY));
    }

    mediaEl.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    mediaEl.style.transition = snap ? "transform 0.3s ease-out" : "none";

    zoomLabel.replaceChildren(document.createTextNode(`Zoom: ${state.scale.toFixed(1)}x`));
  }

  function momentumScroll() {
    if (!state.momentum) return;
    state.offsetX += state.velocityX * 0.9;
    state.offsetY += state.velocityY * 0.9;
    state.velocityX *= 0.9;
    state.velocityY *= 0.9;
    applyTransform();
    if (Math.abs(state.velocityX) > 0.5 || Math.abs(state.velocityY) > 0.5) {
      requestAnimationFrame(momentumScroll);
    } else {
      state.momentum = false;
    }
  }

  function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // cleanup support
  const destroy = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    mediaEl.removeEventListener("touchmove", onTouchMove);
  };

  return { container, mediaEl, resetZoomBtn, destroy };
};
