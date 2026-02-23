import { CSS_PREFIX } from "./getcss.js";
import { addListener, clamp, updateTransformAll } from "./utilities.js";

function setDraggingTransition(mapWrapper, enable) {
  mapWrapper.style.transition = enable ? "transform 0.05s linear" : "none";
}

/* Pointer handling */
function onPointerDown(state, mapOptions, mapContainer, e) {
    // only primary button
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // ignore when clicking on interactive children
    if (e.target.closest(`.${CSS_PREFIX}-marker`) || e.target.closest(`.${CSS_PREFIX}-locked-area`)) return;
    setDraggingTransition(mapContainer.querySelector(`.${CSS_PREFIX}-wrapper`), false);
    stopInertia(state);
    state.isDragging = true;
    state.lastPointerX = e.clientX ?? 0;
    state.lastPointerY = e.clientY ?? 0;
    state.velocityX = 0;
    state.velocityY = 0;
    mapContainer.setPointerCapture?.(e.pointerId);
    mapContainer.style.cursor = "grabbing";
    if (e.cancelable) e.preventDefault();
  }
  
  function onPointerMove(state, mapOptions, mapWrapper, minimap, minimapViewport, e) {
    if (!state.isDragging) return;
    const clientX = e.clientX ?? 0;
    const clientY = e.clientY ?? 0;
    const dx = clientX - state.lastPointerX;
    const dy = clientY - state.lastPointerY;
  
    state.mapX += dx;
    state.mapY += dy;
    state.velocityX = dx;
    state.velocityY = dy;
    state.lastPointerX = clientX;
    state.lastPointerY = clientY;
  
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }
  
  function onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e) {
    if (!state.isDragging) return;
    state.isDragging = false;
    mapContainer.style.cursor = "grab";
    try { mapContainer.releasePointerCapture?.(e.pointerId); } catch (er) { /* ignore */ }
  
    if (mapOptions.enableInertia && (Math.abs(state.velocityX) > (mapOptions.inertiaStartThreshold || 0.5) || Math.abs(state.velocityY) > (mapOptions.inertiaStartThreshold || 0.5))) {
      startInertia(state, mapOptions, mapWrapper, minimap, minimapViewport);
    }
    setDraggingTransition(mapWrapper, true);
  }
  
  function onWheel(e, state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport) {
    if (e.target.closest(`.${CSS_PREFIX}-marker`) || e.target.closest(`.${CSS_PREFIX}-locked-area`)) return;
    if (e.cancelable) e.preventDefault();
  
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextZoom = clamp(state.zoom + delta * mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
    if (nextZoom === state.zoom) return;
  
    const rect = mapContainer.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
  
    const scale = nextZoom / state.zoom;
    state.mapX -= (pointerX - state.mapX) * (scale - 1);
    state.mapY -= (pointerY - state.mapY) * (scale - 1);
    state.zoom = nextZoom;
  
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }

/* Minimap click */
function onMinimapClick(ev, state, mapOptions, mapWrapper, minimap, minimapViewport) {
    if (!state.minimapScale) return;
    const rect = minimap.getBoundingClientRect();
    const clickedX = ev.clientX - rect.left;
    const clickedY = ev.clientY - rect.top;
    const mapX = clickedX / state.minimapScale;
    const mapY = clickedY / state.minimapScale;
    state.mapX = state.viewportWidth / 2 - mapX * state.zoom;
    state.mapY = state.viewportHeight / 2 - mapY * state.zoom;
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }
  
  /* Resize with debounce */
  function onResize(state, mapOptions, mapWrapper, minimap, minimapViewport) {
    if (state.resizeTimer) clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      state.viewportWidth = mapWrapper.parentElement?.clientWidth || window.innerWidth;
      state.viewportHeight = mapWrapper.parentElement?.clientHeight || window.innerHeight;
      updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
      state.resizeTimer = null;
    }, mapOptions.resizeDebounceMs ?? 150);
  }
  
  /* Keyboard pan/zoom */
  function handleKeyboardPanZoom(e, state, mapOptions, mapWrapper, minimap, minimapViewport) {
    if (e.cancelable) e.preventDefault();
    const panStep = (mapOptions.keyboardPanStep || 50);
    if (e.key === "ArrowUp") state.mapY += panStep;
    if (e.key === "ArrowDown") state.mapY -= panStep;
    if (e.key === "ArrowLeft") state.mapX += panStep;
    if (e.key === "ArrowRight") state.mapX -= panStep;
    if (e.key === "+" || e.key === "=") {
      const nextZoom = clamp(state.zoom + mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
      state.zoom = nextZoom;
    }
    if (e.key === "-") {
      const nextZoom = clamp(state.zoom - mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
      state.zoom = nextZoom;
    }
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }

/* Inertia */
function startInertia(state, mapOptions, mapWrapper, minimap, minimapViewport) {
    stopInertia(state);
    state.inertiaActive = true;
    const friction = mapOptions.inertiaFriction ?? 0.92;
    function step() {
      state.velocityX *= friction;
      state.velocityY *= friction;
      state.mapX += state.velocityX;
      state.mapY += state.velocityY;
      updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
      if (Math.abs(state.velocityX) > (mapOptions.inertiaStopThreshold ?? 0.1) || Math.abs(state.velocityY) > (mapOptions.inertiaStopThreshold ?? 0.1)) {
        state.inertiaFrame = requestAnimationFrame(step);
      } else {
        stopInertia(state);
      }
    }
    state.inertiaFrame = requestAnimationFrame(step);
  }
      
export function stopInertia(state) {
  if (state.inertiaActive && state.inertiaFrame) {
    cancelAnimationFrame(state.inertiaFrame);
    state.inertiaActive = false;
    state.inertiaFrame = null;
  }
}

/* RAF throttle (keeps last args) */
function rafThrottle(state, fn) {
    return (...args) => {
      if (state.rafPending) {
        state._lastArgs = args;
        return;
      }
      state.rafPending = true;
      state._lastArgs = null;
      requestAnimationFrame(() => {
        state.rafPending = false;
        fn(...args);
        if (state._lastArgs) fn(...state._lastArgs);
      });
    };
  }
  
/* ---------- Interactions (pointer-based) ---------- */

export function bindInteractions(state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport) {
    // pointer events on container / window
    addListener(state, mapContainer, "pointerdown", (e) => onPointerDown(state, mapOptions, mapContainer, e), { passive: false });
    addListener(state, window, "pointermove", rafThrottle(state, (e) => onPointerMove(state, mapOptions, mapWrapper, minimap, minimapViewport, e)));
    addListener(state, window, "pointerup", (e) => onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e));
    addListener(state, window, "pointercancel", (e) => onPointerUp(state, mapContainer, mapOptions, mapWrapper, minimap, minimapViewport, e));
  
    // wheel zoom
    addListener(state, mapContainer, "wheel", (e) => onWheel(e, state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport), { passive: false });
  
    // minimap click
    if (minimap) addListener(state, minimap, "click", (e) => onMinimapClick(e, state, mapOptions, mapWrapper, minimap, minimapViewport), { passive: true });
  
    // resize
    addListener(state, window, "resize", () => onResize(state, mapOptions, mapWrapper, minimap, minimapViewport), { passive: true });
  
    // keyboard accessibility (arrow keys and +/-)
    addListener(state, mapContainer, "keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "+" || e.key === "-" || e.key === "=") {
        handleKeyboardPanZoom(e, state, mapOptions, mapWrapper, minimap, minimapViewport);
      }
    }, { passive: false });
  
    // default cursor
    mapContainer.style.cursor = "grab";
    mapContainer.style.touchAction = "none";
  
    // ensure transforms update when images load
    const mapImg = mapWrapper.querySelector("img");
    const miniImg = minimap?.querySelector("img");
  
    function onLoadUpdate() {
      state.minimapScale = minimap ? minimap.clientWidth / (mapImg?.naturalWidth || mapOptions.mapWidth) : 1;
      updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
    }
  
    if ((mapImg?.complete ?? true) && (miniImg?.complete ?? true)) {
      onLoadUpdate();
    } else {
      if (mapImg) addListener(state, mapImg, "load", onLoadUpdate, { passive: true });
      if (miniImg) addListener(state, miniImg, "load", onLoadUpdate, { passive: true });
    }
  }
  