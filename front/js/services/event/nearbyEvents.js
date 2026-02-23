import { displayDynamicMap } from "../maps/genericMap.js";

const container = document.getElementById("map-root");

// Define map bounds (approximate area)
const mapBounds = {
  minLat: 37.700,  // South
  maxLat: 37.830,  // North
  minLon: -122.520, // West
  maxLon: -122.350, // East
};

// Simulate API or generated events
function generateNearbyEvents(userLat, userLon) {
  const events = [];
  for (let i = 0; i < 6; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.02; // within ~2 km
    const offsetLon = (Math.random() - 0.5) * 0.02;
    events.push({
      lat: userLat + offsetLat,
      lon: userLon + offsetLon,
      type: i % 2 === 0 ? "event" : "shop",
      name: i % 2 === 0 ? `Live Event #${i + 1}` : `Shop #${i + 1}`,
    });
  }
  return events;
}

if (navigator.geolocation) {
  // Get current location and render map
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLat = pos.coords.latitude;
      const userLon = pos.coords.longitude;

      const events = generateNearbyEvents(userLat, userLon);

      displayDynamicMap(container, {
        mapImage: "/assets/city-map.jpg",
        mapWidth: 1200,
        mapHeight: 800,
        mapBounds,
        currentLocation: { lat: userLat, lon: userLon },
        markers: events,
        showLegend: true,
        lockedAreas: [
          { x: 500, y: 100, width: 150, height: 120, label: "VIP Zone", dependsOn: "access-pass" },
        ],
      });
    },
    (err) => {
      console.error("Geolocation failed:", err);
      // fallback: use static coordinates
      const fallbackLat = 37.7749;
      const fallbackLon = -122.4194;

      const events = generateNearbyEvents(fallbackLat, fallbackLon);

      displayDynamicMap(container, {
        mapImage: "/assets/city-map.jpg",
        mapWidth: 1200,
        mapHeight: 800,
        mapBounds,
        currentLocation: { lat: fallbackLat, lon: fallbackLon },
        markers: events,
        showLegend: true,
      });
    }
  );
}