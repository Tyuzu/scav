// utilities.js

/* ---------- Numeric Utilities ---------- */

/**
 * Clamp a number between min and max.
 * Automatically fixes swapped bounds.
 * @param {number} v - value to clamp
 * @param {number} min - minimum bound
 * @param {number} max - maximum bound
 * @returns {number}
 */
export function clamp(v, min, max) {
  if (min > max) [min, max] = [max, min];
  return v < min ? min : v > max ? max : v;
}

/* ---------- Transform Utilities ---------- */

/**
 * Update map transform (position + zoom).
 * @param {object} state - shared map state
 * @param {object} mapOptions - map configuration
 * @param {HTMLElement} mapWrapper - map wrapper element
 */
export function updateMapTransform(state, mapOptions, mapWrapper) {
  if (!mapWrapper || !mapOptions) return;

  const { mapWidth = 0, mapHeight = 0 } = mapOptions;
  const { viewportWidth, viewportHeight, zoom } = state;

  const minX = viewportWidth - mapWidth * zoom;
  const minY = viewportHeight - mapHeight * zoom;

  state.mapX = clamp(state.mapX, Math.min(minX, 0), 0);
  state.mapY = clamp(state.mapY, Math.min(minY, 0), 0);

  // Use requestAnimationFrame for smoother updates
  requestAnimationFrame(() => {
    mapWrapper.style.transform =
      `translate(${Math.round(state.mapX)}px, ${Math.round(state.mapY)}px) scale(${zoom})`;
  });
}

/**
 * Update minimap viewport rectangle.
 * @param {object} state - shared map state
 * @param {object} mapOptions - map configuration
 * @param {HTMLElement} minimap - minimap container
 * @param {HTMLElement} minimapViewport - viewport rectangle element
 */
export function updateMinimapViewport(state, mapOptions, minimap, minimapViewport) {
  if (!minimap || !minimapViewport) return;

  const { mapWidth = 0 } = mapOptions;
  const { viewportWidth, viewportHeight, zoom } = state;

  const img = minimap.querySelector("img");
  const minimapRect = minimap.getBoundingClientRect();
  const imgWidth = img?.naturalWidth || mapWidth || 1;
  const scale = minimapRect.width / imgWidth;

  state.minimapScale = scale;

  const viewportW = (viewportWidth / zoom) * scale;
  const viewportH = (viewportHeight / zoom) * scale;
  const left = (-state.mapX / zoom) * scale;
  const top = (-state.mapY / zoom) * scale;

  const style = minimapViewport.style;
  style.width = `${Math.round(viewportW)}px`;
  style.height = `${Math.round(viewportH)}px`;
  style.left = `${Math.round(left)}px`;
  style.top = `${Math.round(top)}px`;
}

/**
 * Update both map transform and minimap viewport.
 */
export function updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport) {
  updateMapTransform(state, mapOptions, mapWrapper);
  updateMinimapViewport(state, mapOptions, minimap, minimapViewport);
}

/* ---------- Event Utilities ---------- */

/**
 * Safely add an event listener and track it for later removal.
 * @param {object} state - shared map state (stores listeners)
 * @param {EventTarget} target - target element
 * @param {string} event - event type
 * @param {Function} fn - listener function
 * @param {object|boolean} [opts={}] - options or capture flag
 */
export function addListener(state, target, event, fn, opts = {}) {
  if (!target || typeof fn !== "function") return;

  target.addEventListener(event, fn, opts);
  if (!Array.isArray(state.listeners)) state.listeners = [];
  state.listeners.push({ target, event, fn, opts });
}

/**
 * Remove all tracked listeners (called during destroy).
 * @param {object} state - shared map state
 */
export function removeAllListeners(state) {
  if (!state?.listeners) return;
  for (const { target, event, fn, opts } of state.listeners) {
    try {
      target.removeEventListener(event, fn, opts);
    } catch (_) {
      // ignore errors
    }
  }
  state.listeners.length = 0;
}

/**
 * Remove a specific listener.
 * @param {object} state - shared map state
 * @param {EventTarget} target - target element
 * @param {string} event - event type
 * @param {Function} fn - listener function
 */
export function removeListener(state, target, event, fn) {
  if (!state?.listeners) return;
  state.listeners = state.listeners.filter((rec) => {
    if (rec.target === target && rec.event === event && rec.fn === fn) {
      try {
        target.removeEventListener(event, fn, rec.opts);
      } catch (_) {
        // ignore
      }
      return false;
    }
    return true;
  });
}
