import { createElement } from "../../components/createElement.js";
import { displayGenericMap } from "../remap/displayGenericMap.js";

export function displayPlacesMap(options = {}) {
  const defaultOptions = {
    defaultLocation: { lat: 37.7749, lon: -122.4194 },
    mapImage: "",
    mapWidth: 1200,
    mapHeight: 800,
    mapBounds: {
      minLat: 37.700,
      maxLat: 37.830,
      minLon: -122.520,
      maxLon: -122.350,
    },
    markerCount: 8,
    showLegend: true,
    lockedAreas: [
      { x: 480, y: 140, width: 160, height: 120, label: "VIP Zone" },
    ],
    minZoom: 0.5,
    maxZoom: 3,
    zoomStep: 0.1,
    enableInertia: true,
    enableTouch: true,
  };

  const mapOptions = { ...defaultOptions, ...options };
  const container = createElement("div", { class: "mapcon" });

  // Helper to generate random markers within bounds
  const generateMarkers = (bounds, count) => {
    const types = ["event", "shop", "enemy", "place"];
    return Array.from({ length: count }, (_, i) => {
      const lat =
        bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lon =
        bounds.minLon + Math.random() * (bounds.maxLon - bounds.minLon);
      const type = types[i % types.length];
      return {
        lat,
        lon,
        type,
        title: `${type.toUpperCase()} #${i + 1}`,
      };
    });
  };

  const initMap = (lat, lon) => {
    const { mapBounds, mapWidth, mapHeight } = mapOptions;

    // Pixel conversion functions
    const lonToX = (lonVal) =>
      ((lonVal - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) *
      mapWidth;

    const latToY = (latVal) =>
      ((mapBounds.maxLat - latVal) / (mapBounds.maxLat - mapBounds.minLat)) *
      mapHeight;

    const finalOptions = {
      ...mapOptions,
      currentLocation: { lat, lon },
      markers: generateMarkers(mapBounds, mapOptions.markerCount),
      lonToX,
      latToY,
    };

    return displayGenericMap(container, finalOptions);
  };

  // Initialize map with default location
  const mapAPI = initMap(mapOptions.defaultLocation.lat, mapOptions.defaultLocation.lon);

  // Optional: Uncomment to use actual geolocation
  /*
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        mapAPI.renderMarkers(
          generateMarkers(mapOptions.mapBounds, mapOptions.markerCount),
          { lat: pos.coords.latitude, lon: pos.coords.longitude }
        ),
      () =>
        mapAPI.renderMarkers(
          generateMarkers(mapOptions.mapBounds, mapOptions.markerCount),
          mapOptions.defaultLocation
        ),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  */

  // return { container, mapAPI };
  return container;
}
