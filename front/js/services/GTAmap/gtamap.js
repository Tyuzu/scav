// gtaMap.js
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Imagex from "../../components/base/Imagex.js";

/**
 * Display a GTA-style map: fetches config + markers for an entity and renders a responsive viewport
 * (100vw x 90vh) over a native map grid (defaults to 1200x600). Locked areas may be shown unless
 * they overlap markers (then skipped).
 *
 * @param {HTMLElement} container
 * @param {boolean} isLoggedIn
 * @param {string} entity - entity id ("ls","sf","lv") - optional, defaults to "ls"
 */
export async function displayGtaMap(container, isLoggedIn, entity = "ls") {
  // remove previous children
  while (container.firstChild) container.removeChild(container.firstChild);

  // remove previous resize listener if present to avoid duplicates
  if (container.__gtaMapResizeHandler) {
    window.removeEventListener("resize", container.__gtaMapResizeHandler);
    delete container.__gtaMapResizeHandler;
  }

  // fetch config + markers (backend endpoints are entity-specific)
  let config = {};
  let markers = [];
  try {
    config = await apiFetch(`/maps/config/${encodeURIComponent(entity)}`);
    markers = await apiFetch(`/maps/markers/${encodeURIComponent(entity)}`);
  } catch (err) {
    console.error("Failed to load map data:", err);
    // fallback minimal config so UI still renders
    config = { mapImage: "/assets/gta-map.jpg", mapWidth: 1200, mapHeight: 600, entity };
    markers = [];
  }

  const mapWidth = config.mapWidth || 1200;
  const mapHeight = config.mapHeight || 600;
  const mapImageUrl = config.mapImage || "/assets/gta-map.jpg";

  // viewport uses full width and 90% of viewport height
  let viewportWidth = Math.max(300, window.innerWidth); // guard minimum
  let viewportHeight = Math.max(200, Math.round(window.innerHeight * 0.9));

  // Advance mission button
  const advanceBtn = createElement(
    "button",
    { id: "advance-btn", style: "margin-bottom:8px;padding:6px 12px;cursor:pointer;z-index:40;" },
    ["▶ Advance Mission"]
  );
  advanceBtn.addEventListener("click", async () => {
    try {
      await apiFetch(`/player/progress?entity=${encodeURIComponent(entity)}`, "POST");
      // refetch and rerender (function fetches again internally)
      displayGtaMap(container, isLoggedIn, entity);
    } catch (err) {
      console.error("Failed to advance mission:", err);
    }
  });

  // Map container (responsive viewport)
  const mapContainer = createElement(
    "div",
    {
      id: "map-container",
      style: `position:relative;overflow:hidden;width:${viewportWidth}px;height:${viewportHeight}px;border:2px solid #333;cursor:grab;background:#000;`,
    },
    []
  );

  // Map image with native pixel size so marker coordinates align
  const mapInner = Imagex( {
    id: "map-inner",
    src: mapImageUrl,
    width: String(mapWidth),
    height: String(mapHeight),
    style: `display:block;width:${mapWidth}px;height:${mapHeight}px;user-drag:none;pointer-events:none;`,
  });

  // Layers sized at native map dimensions; wrapper is transformed for pan/zoom
  const markerLayer = createElement("div", {
    id: "marker-layer",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;pointer-events:none;`,
  });
  const lockedLayer = createElement("div", {
    id: "locked-layer",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;pointer-events:none;`,
  });
  const mapWrapper = createElement("div", {
    id: "map-wrapper",
    style: `position:absolute;left:0;top:0;width:${mapWidth}px;height:${mapHeight}px;transform-origin:0 0;`,
  }, [mapInner, markerLayer, lockedLayer]);

  mapContainer.appendChild(mapWrapper);

  // Legend (toggled with L)
  const legend = createElement("div", {
    id: "legend",
    style: "position:absolute;top:10px;left:10px;background:#222;color:#fff;padding:8px;display:none;z-index:50;font-size:13px;",
  }, [
    createElement("div", {}, ["🏠 Safehouse"]),
    createElement("div", {}, ["⭐ Mission"]),
    createElement("div", {}, ["💲 Shop"]),
    createElement("div", {}, ["💀 Enemy"]),
  ]);

  // Zoom controls
  const zoomControls = createElement("div", {
    id: "zoom-controls",
    style: "position:absolute;top:10px;right:10px;z-index:50;display:flex;flex-direction:column;gap:6px;",
  }, [
    createElement("button", {}, ["+"]),
    createElement("button", {}, ["−"]),
  ]);

  // Minimap / radar
  const minimapImage = Imagex( {
    src: mapImageUrl,
    style: "width:100%;height:100%;object-fit:cover;display:block;",
  });
  const minimapViewport = createElement("div", {
    id: "minimap-viewport",
    style: "position:absolute;border:2px solid red;pointer-events:none;width:40px;height:40px;",
  });
  const minimap = createElement("div", {
    id: "minimap",
    style: `position:absolute;bottom:10px;right:10px;width:120px;height:120px;border:2px solid #333;overflow:hidden;z-index:50;background:#000;`,
  }, [minimapImage, minimapViewport]);

  // Info panel
  const infoTitle = createElement("h3", {}, ["Info"]);
  const infoContent = createElement("p", {}, ["Click a marker to see details"]);
  const closeBtn = createElement("button", {}, ["Close"]);
  const infoPanel = createElement("div", {
    id: "info-panel",
    style: "position:absolute;bottom:10px;left:10px;width:260px;background:#fff;border:1px solid #333;padding:10px;display:none;z-index:60;",
  }, [closeBtn, infoTitle, infoContent]);
  closeBtn.addEventListener("click", () => {
    infoPanel.style.display = "none";
  });

  // Assemble UI
  container.appendChild(advanceBtn);
  container.appendChild(mapContainer);
  container.appendChild(legend);
  container.appendChild(zoomControls);
  container.appendChild(minimap);
  container.appendChild(infoPanel);

  // Emoji map for marker types
  const emojiMap = { house: "🏠", mission: "⭐", shop: "💲", enemy: "💀" };

  // Create markers (enable pointer events for each marker element)
  markers.forEach((marker) => {
    const el = createElement("div", {
      class: "marker",
      style: `
        position:absolute;
        left:${marker.x}px;
        top:${marker.y}px;
        font-size:22px;
        cursor:pointer;
        pointer-events:auto;
        z-index:5;
        transform:translate(-50%,-50%);
        user-select:none;
      `,
      title: marker.name,
    }, [ emojiMap[marker.type] || "❓" ]);

    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      // update infoPanel title/content by replacing children (no textContent)
      while (infoTitle.firstChild) infoTitle.removeChild(infoTitle.firstChild);
      while (infoContent.firstChild) infoContent.removeChild(infoContent.firstChild);
      infoTitle.appendChild(createElement("span", {}, [marker.name]));
      infoContent.appendChild(createElement("span", {}, [`Type: ${marker.type}`]));
      infoPanel.style.display = "block";
    });

    markerLayer.appendChild(el);
  });

  // Locked areas: skip if any locked area covers any marker (to preserve marker visibility)
  const lockedAreas = Array.isArray(config.lockedAreas) ? config.lockedAreas : [];
  let skipLocks = false;
  if (lockedAreas.length > 0 && markers.length > 0) {
    outer:
    for (let area of lockedAreas) {
      for (let mk of markers) {
        if (mk.x >= area.x && mk.x <= area.x + area.width && mk.y >= area.y && mk.y <= area.y + area.height) {
          skipLocks = true;
          console.warn("Locked areas overlap markers — skipping lock overlays to keep markers visible.");
          break outer;
        }
      }
    }
  }

  if (!skipLocks && lockedAreas.length > 0) {
    lockedLayer.style.pointerEvents = "auto";
    lockedAreas.forEach((area) => {
      const lockInfoNodes = [];
      if (area.dependsOn) lockInfoNodes.push(createElement("div", {}, [`Requires: ${String(area.dependsOn).toUpperCase()}`]));
      if (area.condition) lockInfoNodes.push(createElement("div", {}, [String(area.condition)]));

      const lockedDiv = createElement("div", {
        class: "locked-area",
        style: `
          position:absolute;
          left:${area.x}px;
          top:${area.y}px;
          width:${area.width}px;
          height:${area.height}px;
          background:rgba(0,0,0,0.45);
          color:white;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          font-size:13px;
          text-align:center;
          pointer-events:auto;
          z-index:10;
          padding:6px;
        `,
      }, [ createElement("div", {}, [`🚫 ${area.label}`]), ...lockInfoNodes ]);

      lockedLayer.appendChild(lockedDiv);
    });
  } else {
    lockedLayer.style.pointerEvents = "none";
  }

  // Pan & zoom initial values (center the native map inside the viewport)
  let isDragging = false, startX = 0, startY = 0;
  let mapX = Math.round((viewportWidth - mapWidth) / 2), mapY = Math.round((viewportHeight - mapHeight) / 2);
  let zoom = 1;
  const zoomStep = 0.1;

  function applyTransform() {
    mapWrapper.style.transform = `translate(${mapX}px, ${mapY}px) scale(${zoom})`;
    updateMinimap();
  }

  function updateMinimap() {
    const visibleWidth = viewportWidth / zoom;
    const visibleHeight = viewportHeight / zoom;
    const minimapScale = minimap.offsetWidth / mapWidth;
    minimapViewport.style.width = `${visibleWidth * minimapScale}px`;
    minimapViewport.style.height = `${visibleHeight * minimapScale}px`;
    minimapViewport.style.left = `${-mapX * minimapScale}px`;
    minimapViewport.style.top = `${-mapY * minimapScale}px`;
  }

  // mousedown / move / up
  mapContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    mapContainer.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    mapX += e.clientX - startX;
    mapY += e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    applyTransform();
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    mapContainer.style.cursor = "grab";
  });

  // zoom buttons
  const [zoomInBtn, zoomOutBtn] = zoomControls.querySelectorAll("button");
  zoomInBtn.addEventListener("click", () => { zoom += zoomStep; applyTransform(); });
  zoomOutBtn.addEventListener("click", () => { zoom = Math.max(0.5, zoom - zoomStep); applyTransform(); });

  // Legend toggle with L
  document.addEventListener("keydown", (ev) => {
    if (ev.key && ev.key.toLowerCase() === "l") {
      legend.style.display = legend.style.display === "none" ? "block" : "none";
    }
  });

  // responsive resize handler
  const resizeHandler = () => {
    viewportWidth = Math.max(300, window.innerWidth);
    viewportHeight = Math.max(200, Math.round(window.innerHeight * 0.9));
    // update mapContainer size
    mapContainer.style.width = `${viewportWidth}px`;
    mapContainer.style.height = `${viewportHeight}px`;
    // keep map centered relative to new viewport by biasing mapX/Y if map smaller/larger
    // (preserve previous mapX/Y as much as possible; keep consistent)
    applyTransform();
  };

  // attach resize handler safely to avoid duplicates
  window.addEventListener("resize", resizeHandler);
  container.__gtaMapResizeHandler = resizeHandler;

  // initial transform
  applyTransform();
}
