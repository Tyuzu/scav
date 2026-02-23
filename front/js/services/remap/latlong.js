// latlong.js
import { clamp } from "./utilities.js";

/* ---------- Initialize Map Position ---------- */
/**
 * Center map on current location if available, otherwise center entire map.
 * @param {object} state
 * @param {object} mapOptions
 * @param {Function} latToYFn
 * @param {Function} lonToXFn
 */
export function initPosition(state, mapOptions, latToYFn, lonToXFn) {
  const mapW = mapOptions.mapWidth || 0;
  const mapH = mapOptions.mapHeight || 0;

  state.zoom = clamp(state.zoom || 1, mapOptions.minZoom, mapOptions.maxZoom);

  if (mapOptions.currentLocation && lonToXFn && latToYFn) {
    const { lon, lat } = mapOptions.currentLocation;
    const cx = lonToXFn(lon);
    const cy = latToYFn(lat);
    state.mapX = state.viewportWidth / 2 - cx * state.zoom;
    state.mapY = state.viewportHeight / 2 - cy * state.zoom;
  } else {
    state.mapX = (state.viewportWidth - mapW * state.zoom) / 2;
    state.mapY = (state.viewportHeight - mapH * state.zoom) / 2;
  }
}

/* ---------- Latitude → Y ---------- */
/**
 * Convert latitude to Y pixel coordinate.
 * Supports "linear" and "mercator" projections.
 * @param {number} lat
 * @param {object} mapOptions
 * @returns {number}
 */
export function latToY(lat, mapOptions) {
  const bounds = mapOptions.mapBounds || {};
  const minLat = Number.isFinite(bounds.minLat) ? bounds.minLat : -90;
  const maxLat = Number.isFinite(bounds.maxLat) ? bounds.maxLat : 90;
  const mapHeight = mapOptions.mapHeight || 0;
  const projection = mapOptions.projection || "linear";

  if (projection === "mercator") {
    const safeLat = clamp(lat, -85.05112878, 85.05112878);
    const rad = safeLat * Math.PI / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + rad / 2));

    const minRad = clamp(minLat, -85.05112878, 85.05112878) * Math.PI / 180;
    const maxRad = clamp(maxLat, -85.05112878, 85.05112878) * Math.PI / 180;

    const yMin = Math.log(Math.tan(Math.PI / 4 + minRad / 2));
    const yMax = Math.log(Math.tan(Math.PI / 4 + maxRad / 2));
    const denom = yMax - yMin || 1;

    return mapHeight * (yMax - y) / denom;
  }

  // Linear projection
  const denom = maxLat - minLat || 1;
  return mapHeight * (maxLat - lat) / denom;
}

/* ---------- Longitude → X ---------- */
/**
 * Convert longitude to X pixel coordinate.
 * @param {number} lon
 * @param {object} mapOptions
 * @returns {number}
 */
export function lonToX(lon, mapOptions) {
  const bounds = mapOptions.mapBounds || {};
  const minLon = Number.isFinite(bounds.minLon) ? bounds.minLon : -180;
  const maxLon = Number.isFinite(bounds.maxLon) ? bounds.maxLon : 180;
  const mapWidth = mapOptions.mapWidth || 0;

  const denom = maxLon - minLon || 1;
  return mapWidth * (lon - minLon) / denom;
}
