// displayGenericMap.js
import { createElement } from "../../components/createElement.js";
import Imagex from "../../components/base/Imagex.js";
import { CSS_PREFIX, DEFAULT_STYLE } from "./getcss.js";
import { bindInteractions, stopInertia } from "./interactionsBinder.js";
import { addListener, removeAllListeners, clamp, updateTransformAll } from "./utilities.js";
import { renderMarkers } from "./renderMarkers.js";
import { latToY, lonToX, initPosition } from "./latlong.js";

/* ---------- Defaults ---------- */
const DEFAULTS = {
  mapImage: "",
  mapWidth: 1200,
  mapHeight: 800,
  mapBounds: { minLat: 0, maxLat: 100, minLon: 0, maxLon: 100 },
  markers: [],
  currentLocation: null,
  lockedAreas: [],
  showLegend: true,
  minZoom: 0.5,
  maxZoom: 3,
  zoomStep: 0.1,
  enableInertia: true,
  enableTouch: true,
  onMarkerClick: null,
  onLockedAreaClick: null,
  onInfoClose: null,
  inertiaFriction: 0.92,
  inertiaStartThreshold: 0.5,
  inertiaStopThreshold: 0.1,
  resizeDebounceMs: 150,
  enableZoomScaling: false,
  projection: "linear",
  lonToX: null,
  latToY: null,
  customControls: null, // new: user-supplied buttons
  theme: "light", // new: "light" | "dark"
};

/* ---------- Utilities ---------- */
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ---------- Shared Style (once per page) ---------- */
(function ensureGlobalStyle() {
  if (!document.getElementById(`${CSS_PREFIX}-style`)) {
    const style = document.createElement("style");
    style.id = `${CSS_PREFIX}-style`;
    style.textContent = DEFAULT_STYLE;
    document.head.appendChild(style);
  }
})();

/* ---------- UI: Zoom Controls ---------- */
function createZoomControls(state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport) {
  const zoomInBtn = createElement("button", { type: "button", "aria-label": "Zoom in", class: `${CSS_PREFIX}-btn` }, "+");
  const zoomOutBtn = createElement("button", { type: "button", "aria-label": "Zoom out", class: `${CSS_PREFIX}-btn` }, "−");
  const controls = createElement("div", { class: `${CSS_PREFIX}-zoom-controls` }, [zoomInBtn, zoomOutBtn]);

  // Optional range slider for smooth zoom
  const zoomSlider = createElement("input", {
    type: "range",
    min: mapOptions.minZoom,
    max: mapOptions.maxZoom,
    step: mapOptions.zoomStep,
    value: state.zoom,
    style: "width:32px; writing-mode: bt-lr; appearance: slider-vertical;"
  });

  function applyZoomChange(delta) {
    const newZoom = clamp(state.zoom + delta * mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom);
    if (newZoom === state.zoom) return;
    const rect = mapContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const scale = newZoom / state.zoom;
    state.mapX -= (centerX - state.mapX) * (scale - 1);
    state.mapY -= (centerY - state.mapY) * (scale - 1);
    state.zoom = newZoom;
    zoomSlider.value = newZoom;
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }

  addListener(state, zoomInBtn, "click", () => applyZoomChange(1));
  addListener(state, zoomOutBtn, "click", () => applyZoomChange(-1));
  addListener(state, zoomSlider, "input", e => {
    state.zoom = Number(e.target.value);
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  });

  controls.appendChild(zoomSlider);
  if (mapOptions.customControls) {
    mapOptions.customControls.forEach(el => controls.appendChild(el));
  }

  return controls;
}

/* ---------- UI: Info Panel ---------- */
function createInfoPanel(state, mapOptions) {
  const closeBtn = createElement("button", { type: "button", class: `${CSS_PREFIX}-info-close`, "aria-label": "close" }, "×");
  const title = createElement("h3", {}, "Info");
  const content = createElement("div", {}, "Click a marker to see details");
  const panel = createElement("div", { class: `${CSS_PREFIX}-info-panel`, role: "dialog", "aria-hidden": "true" }, [closeBtn, title, content]);

  function showInfo(markerData) {
    clearChildren(content);
    if (markerData.image) content.appendChild(Imagex({ src: markerData.image, width: "100%" }));
    if (markerData.title) content.appendChild(createElement("h4", {}, markerData.title));
    if (markerData.description) content.appendChild(createElement("p", {}, markerData.description));
    panel.style.display = "block";
    panel.setAttribute("aria-hidden", "false");
  }

  function hideInfo() {
    panel.style.display = "none";
    panel.setAttribute("aria-hidden", "true");
    if (typeof mapOptions.onInfoClose === "function") mapOptions.onInfoClose();
  }

  addListener(state, closeBtn, "click", hideInfo);
  return { panel, showInfo, hideInfo };
}

/* ---------- UI: Legend ---------- */
function createLegend() {
  const legend = createElement("div", { class: `${CSS_PREFIX}-legend` }, [
    createElement("div", {}, ["🏠 Place"]),
    createElement("div", {}, ["⭐ Event"]),
    createElement("div", {}, ["💲 Shop"]),
    createElement("div", {}, ["💀 Enemy"]),
    createElement("div", {}, ["📍 You"]),
  ]);
  const toggleBtn = createElement("button", { type: "button", class: `${CSS_PREFIX}-btn`, "aria-label": "Toggle legend" }, "❔");
  toggleBtn.style.marginLeft = "8px";
  toggleBtn.addEventListener("click", () => {
    legend.style.display = legend.style.display === "none" ? "block" : "none";
  });
  const wrapper = createElement("div", { style: "display:flex;align-items:center;gap:4px;" }, [legend, toggleBtn]);
  return wrapper;
}

/* ---------- Main Export ---------- */
export function displayGenericMap(container, options = {}) {
  if (!container) throw new Error("Container element required");
  const mapOptions = { ...DEFAULTS, ...options };

  // Theme setup
  document.documentElement.setAttribute("data-theme", mapOptions.theme);

  // Coordinate conversions
  mapOptions.lonToX = mapOptions.lonToX || ((lon) => lonToX(lon, mapOptions));
  mapOptions.latToY = mapOptions.latToY || ((lat) => latToY(lat, mapOptions));

  // State
  const state = {
    viewportWidth: container.clientWidth || window.innerWidth,
    viewportHeight: container.clientHeight || window.innerHeight * 0.9,
    mapX: 0,
    mapY: 0,
    zoom: 1,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    velocityX: 0,
    velocityY: 0,
    inertiaFrame: null,
    inertiaActive: false,
    rafPending: false,
    markerMap: new Map(),
    lockedMap: new Map(),
    userEl: null,
    listeners: [],
    destroyed: false,
    resizeTimer: null,
    minimapScale: 1,
    markerLayer: null,
  };

  clearChildren(container);

  // Map core structure
  const mapInner = Imagex({
    src: mapOptions.mapImage,
    width: `${mapOptions.mapWidth}`,
    height: `${mapOptions.mapHeight}`,
  });
  mapInner.classList?.add(`${CSS_PREFIX}-inner`);

  const markerLayer = createElement("div", { class: `${CSS_PREFIX}-marker-layer` });
  const mapWrapper = createElement("div", { class: `${CSS_PREFIX}-wrapper` }, [mapInner, markerLayer]);
  const mapContainer = createElement("div", { class: `${CSS_PREFIX}-container`, tabindex: 0 }, [mapWrapper]);
  state.markerLayer = markerLayer;

  // Minimap
  const miniImg = Imagex({ src: mapOptions.mapImage });
  miniImg.setAttribute("loading", "lazy");
  const minimapViewport = createElement("div", { class: `${CSS_PREFIX}-minimap-viewport` });
  const minimap = createElement("div", { class: `${CSS_PREFIX}-minimap` }, [miniImg, minimapViewport]);

  // Panels
  const zoomControls = createZoomControls(state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport);
  const { panel: infoPanel, showInfo, hideInfo } = createInfoPanel(state, mapOptions);
  const legend = mapOptions.showLegend ? createLegend() : null;

  container.append(mapContainer, minimap, zoomControls, infoPanel);
  if (legend) container.appendChild(legend);

  /* ---------- Initialize ---------- */
  function initializeMap() {
    if (state._initialized) return;
    state._initialized = true;
    state.minimapScale = minimap.clientWidth / (mapOptions.mapWidth || 1);
    initPosition(state, mapOptions, mapOptions.latToY, mapOptions.lonToX);
    renderMarkers(state, mapOptions);
    updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  }

  const mainImg = mapWrapper.querySelector("img");
  const miniReady = miniImg.complete;
  const mainReady = !mainImg || mainImg.complete;
  if (mainReady && miniReady) initializeMap();
  else {
    if (mainImg) addListener(state, mainImg, "load", initializeMap);
    if (miniImg) addListener(state, miniImg, "load", initializeMap);
  }

  /* ---------- Keyboard Navigation ---------- */
  addListener(state, mapContainer, "keydown", (e) => {
    let moved = false;
    switch (e.key) {
      case "+": case "=": state.zoom = clamp(state.zoom + mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom); moved = true; break;
      case "-": state.zoom = clamp(state.zoom - mapOptions.zoomStep, mapOptions.minZoom, mapOptions.maxZoom); moved = true; break;
      case "ArrowUp": state.mapY += 50; moved = true; break;
      case "ArrowDown": state.mapY -= 50; moved = true; break;
      case "ArrowLeft": state.mapX += 50; moved = true; break;
      case "ArrowRight": state.mapX -= 50; moved = true; break;
    }
    if (moved) updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
  });

  /* ---------- Interactions ---------- */
  bindInteractions(state, mapOptions, mapContainer, mapWrapper, minimap, minimapViewport);

  /* ---------- Resize Handling ---------- */
  addListener(state, window, "resize", () => {
    if (state.resizeTimer) clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      state.viewportWidth = container.clientWidth;
      state.viewportHeight = container.clientHeight;
      updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
    }, mapOptions.resizeDebounceMs);
  });

  /* ---------- Destroy ---------- */
  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    removeAllListeners(state);
    stopInertia(state);
    clearTimeout(state.resizeTimer);
    [mapContainer, minimap, zoomControls, infoPanel, legend].forEach(el => el?.remove());
    state.markerMap.clear();
    state.lockedMap.clear();
  }

  /* ---------- Public API ---------- */
  return {
    mapContainer,
    renderMarkers: (markers = mapOptions.markers, userLoc = mapOptions.currentLocation) => {
      mapOptions.markers = markers;
      mapOptions.currentLocation = userLoc;
      renderMarkers(state, mapOptions);
      updateTransformAll(state, mapOptions, mapWrapper, minimap, minimapViewport);
    },
    showInfo,
    hideInfo,
    latToY: (lat) => mapOptions.latToY(lat),
    lonToX: (lon) => mapOptions.lonToX(lon),
    mapOptions,
    destroy,
  };
}