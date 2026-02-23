// renderMarkers.js
import { createElement } from "../../components/createElement.js";
import { CSS_PREFIX } from "./getcss.js";

/* ---------- Emoji map ---------- */
const emojiMap = {
  place: "🏠",
  event: "⭐",
  shop: "💲",
  enemy: "💀",
  current: "📍",
  unknown: "❓",
};

/* ---------- Render Markers ---------- */
export function renderMarkers(state, mapOptions) {
  const { markers = [], currentLocation, lockedAreas = [] } = mapOptions;
  const markerLayer = state.markerLayer;
  if (!markerLayer) return;

  const scale = state.zoom || 1;
  const needsZoomScaling = !!mapOptions.enableZoomScaling;

  const toPixelX = mapOptions.lonToX || ((lon) => lon);
  const toPixelY = mapOptions.latToY || ((lat) => lat);

  const nextMarkerMap = new Map();

  /* ---------- Normal markers ---------- */
  const fragment = document.createDocumentFragment();

  markers.forEach((mk, i) => {
    const key = mk.id ?? i;
    const x = toPixelX(mk.lon);
    const y = toPixelY(mk.lat);
    const emoji = emojiMap[mk.type] || emojiMap.unknown;
    const prev = state.markerMap.get(key);

    if (prev && prev.x === x && prev.y === y && prev.marker.type === mk.type) {
      nextMarkerMap.set(key, prev);
      return;
    }

    const el = prev?.el || createMarkerEl(mk, key, emoji);
    if (!prev) fragment.appendChild(el);

    const s = el.style;
    s.left = `${Math.round(x * scale)}px`;
    s.top = `${Math.round(y * scale)}px`;
    s.transform = needsZoomScaling
      ? `translate(-50%, -50%) scale(${scale})`
      : `translate(-50%, -50%)`;

    el.textContent = emoji;
    el.title = mk.name || mk.type || "";

    nextMarkerMap.set(key, { el, x, y, marker: mk });
  });

  if (fragment.childNodes.length) markerLayer.appendChild(fragment);

  /* ---------- Cleanup removed markers ---------- */
  for (const [key, val] of state.markerMap.entries()) {
    if (!nextMarkerMap.has(key)) val.el?.remove();
  }
  state.markerMap = nextMarkerMap;

  /* ---------- User marker ---------- */
  if (currentLocation) {
    ensureUserEl(state, markerLayer);
    const ux = toPixelX(currentLocation.lon) * scale;
    const uy = toPixelY(currentLocation.lat) * scale;
    const s = state.userEl.style;
    s.left = `${Math.round(ux)}px`;
    s.top = `${Math.round(uy)}px`;
    s.transform = needsZoomScaling
      ? `translate(-50%, -50%) scale(${scale})`
      : `translate(-50%, -50%)`;
  } else {
    state.userEl?.remove();
    state.userEl = null;
  }

  /* ---------- Locked areas ---------- */
  const nextLocked = new Map();
  lockedAreas.forEach((area, i) => {
    const key = area.id ?? i;
    const prev = state.lockedMap.get(key);
    const el = prev?.el || createLockedEl(area, key);
    if (!prev) markerLayer.appendChild(el);

    const s = el.style;
    s.left = `${Math.round(area.x * scale)}px`;
    s.top = `${Math.round(area.y * scale)}px`;
    s.width = `${Math.round(area.width * scale)}px`;
    s.height = `${Math.round(area.height * scale)}px`;
    s.transform = needsZoomScaling ? `scale(${scale})` : "";

    el.textContent = area.label || "";
    el.title = area.label || "";

    nextLocked.set(key, { el, area });
  });

  for (const [key, val] of state.lockedMap.entries()) {
    if (!nextLocked.has(key)) val.el?.remove();
  }
  state.lockedMap = nextLocked;
}

/* ---------- Helpers ---------- */
function createMarkerEl(marker, key, emoji) {
  return createElement("div", {
    class: `${CSS_PREFIX}-marker marker--${marker.type}`,
    title: marker.name || marker.type || "",
    dataset: { markerIdx: key },
    role: "button",
    tabindex: 0,
    "aria-label": marker.name || marker.type,
  }, emoji);
}

function createLockedEl(area, key) {
  return createElement("div", {
    class: `${CSS_PREFIX}-locked-area`,
    title: area.label || "",
    dataset: { lockedIdx: key },
    role: "button",
    tabindex: 0,
    "aria-label": area.label || "Locked area",
  }, area.label || "");
}

function ensureUserEl(state, markerLayer) {
  if (!state.userEl) {
    const el = createElement("div", {
      class: `${CSS_PREFIX}-user-marker marker--current`,
      title: "You",
      "aria-label": "Your location",
    }, emojiMap.current);
    markerLayer.appendChild(el);
    state.userEl = el;
  }
}

/* ---------- Event Delegation ---------- */
export function attachMarkerEvents(markerLayer, mapOptions) {
  markerLayer.addEventListener("click", (ev) => {
    const target = ev.target.closest(`.${CSS_PREFIX}-marker, .${CSS_PREFIX}-locked-area`);
    if (!target) return;

    if (target.dataset.markerIdx && mapOptions.onMarkerClick) {
      mapOptions.onMarkerClick(target.dataset.markerIdx);
    }
    if (target.dataset.lockedIdx && mapOptions.onLockedAreaClick) {
      mapOptions.onLockedAreaClick(target.dataset.lockedIdx);
    }
  });
}

