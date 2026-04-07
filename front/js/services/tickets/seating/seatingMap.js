import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import Notify from "../../../components/ui/Notify.mjs";
import { apiFetch } from "../../../api/api.js";
import { generateStadiumLayout } from "./stadiumLayout.js";

/**
 * Configurable globals
 */
const PRICE_COLOR_RANGES = [
  { min: 0, max: 49, color: "#7fb3d5" },
  { min: 50, max: 99, color: "#5dade2" },
  { min: 100, max: 199, color: "#f7dc6f" },
  { min: 200, max: 99999, color: "#f39c12" }
];

// /**
//  * Small CSS scoped for the seating map
//  * (we avoid inline styles for most UI; classes used instead)
//  */
// function injectScopedStyles(root) {
//   // only inject once per root container
//   if (root._seatingStylesInjected) return;
//   root._seatingStylesInjected = true;

//   const css = `  `;
//   const style = document.createElement("style");
//   style.appendChild(document.createTextNode(css));
//   document.head.appendChild(style);
// }

/**
 * Helper: find color by ranges (global configurable fallback)
 */
function getPriceColor(price, ranges = PRICE_COLOR_RANGES) {
  if (!ranges || !ranges.length) {
return "#888";
}
  for (const r of ranges) {
if (price >= r.min && price <= r.max) {
return r.color;
}
}
  return ranges[ranges.length - 1]?.color || "#888";
}

/**
 * Simplified seat color decision
 */
function seatColor(seat, priceRanges = PRICE_COLOR_RANGES) {
  if (seat.status === "sold") {
return "#bbb";
}
  if (seat.obstructed) {
return "#999";
}
  return getPriceColor(seat.price ?? 0, priceRanges);
}

/**
 * Tooltip helper
 */
function updateTooltip(tip, section, row, seat) {
  // compose text safely (avoid innerHTML)
  const parts = [
    section?.name ?? "Section",
    `Row ${row?.id ?? "?"}`,
    `Seat ${seat?.label ?? "?"}`,
    `— ${seat?.price ?? "?"} ${seat?.currency ?? ""}`,
    seat?.status ? seat.status.toUpperCase() : "",
    seat?.obstructed ? "• OBSTRUCTED" : ""
  ].filter(Boolean);
  tip.textContent = parts.join(" • ");
}

/**
 * API wrapper for reserve operation with improved feedback
 */
async function reserveSeats(payload) {
  try {
    const res = await apiFetch(`/seats/reserve`, "POST", { seats: payload });
    if (!res) {
      Notify("Server returned an unexpected response.", { type: "error" });
      return { ok: false };
    }
    if (!res.ok) {
      Notify(res.message || "Failed to reserve seats.", { type: "error" });
      return res;
    }
    Notify(res.message || "Seats reserved.", { type: "success" });
    return res;
  } catch (err) {
    console.error("reserveSeats error:", err);
    Notify("Network error reserving seats", { type: "error" });
    return { ok: false };
  }
}

/**
 * Toggle selection logic centralized
 */
function toggleSeatSelection({ selectedMap, seatId, sg, seat, row, section, maxSelection, priceRanges, onSelect }) {
  const already = selectedMap.has(seatId);
  if (already) {
    selectedMap.delete(seatId);
    sg.classList.remove("seat-selected");
    // if it was sold or obstructed, keep that class
    if (seat.status === "sold") {
sg.classList.add("seat-sold");
} else if (seat.obstructed) {
sg.classList.add("seat-obstructed");
} else {
      // reset fill to price color (circle is inside group)
      const circle = sg.querySelector("circle");
      if (circle) {
        circle.setAttribute("fill", seatColor(seat, priceRanges));
        circle.setAttribute("stroke", "#fff");
        circle.setAttribute("stroke-width", "1.25");
        circle.setAttribute("cursor", seat.status === "sold" ? "not-allowed" : "pointer");
      }
    }
  } else {
    if (selectedMap.size >= maxSelection) {
      Notify(`Maximum ${maxSelection} seats allowed.`, { type: "error" });
      return;
    }
    selectedMap.set(seatId, { seat, row, section, sg });
    sg.classList.add("seat-selected");
  }
  onSelect?.(Array.from(selectedMap.values()).map(v => v.seat));
}

/**
 * Zoom & pan utilities with clamped zoom limits
 */
function createZoomPan(svg, dims) {
  const { width, height } = dims;
  // viewBox state
  let viewBox = { x: 0, y: 0, w: width, h: height };
  const MIN_W = width / 3;   // max zoom in (smaller w == zoomed in)
  const MAX_W = width * 2;   // max zoom out
  function applyViewBox() {
 svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`); 
}

  function clampViewBox(vb) {
    const w = Math.max(MIN_W, Math.min(MAX_W, vb.w));
    const h = (w / width) * height;
    return {
      x: vb.x,
      y: vb.y,
      w,
      h
    };
  }

  function zoom(factor) {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const newW = viewBox.w / factor;
    const newH = viewBox.h / factor;
    const candidate = { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    viewBox = clampViewBox(candidate);
    applyViewBox();
  }

  function reset() {
    viewBox = { x: 0, y: 0, w: width, h: height };
    applyViewBox();
  }

  // wheel zoom
  svg.addEventListener("wheel", ev => {
 ev.preventDefault(); zoom(ev.deltaY > 0 ? 1 / 1.12 : 1.12); 
});

  // pan
  let isPanning = false, panStart = null;
  svg.addEventListener("mousedown", ev => {
 if (ev.button !== 0) {
return;
} isPanning = true; panStart = { x: ev.clientX, y: ev.clientY, vb: { ...viewBox } }; svg.style.cursor = "grabbing"; 
});
  window.addEventListener("mousemove", ev => {
    if (!isPanning || !panStart) {
return;
}
    const dx = (ev.clientX - panStart.x) * (panStart.vb.w / svg.clientWidth);
    const dy = (ev.clientY - panStart.y) * (panStart.vb.h / svg.clientHeight);
    viewBox.x = panStart.vb.x - dx;
    viewBox.y = panStart.vb.y - dy;
    applyViewBox();
  });
  window.addEventListener("mouseup", () => {
 isPanning = false; svg.style.cursor = "default"; 
});

  reset();
  return { zoomIn: () => zoom(1.2), zoomOut: () => zoom(1 / 1.2), reset, zoom };
}

/**
 * Main render function - refactored into smaller logical modules but kept in the same file.
 */
export function renderSeatingMap(container, seatingData = {}, opts = {}) {
  const {
    width = 1000,
    height = 600,
    sections = [],
    priceRanges = PRICE_COLOR_RANGES,
    stage,
    screen,
    cranes = [],
    entries = [],
    walkways = []
  } = seatingData;

  const {
    selectable = true,
    maxSelection = 6,
    onSelect = null,
    seatRadius = 9
  } = opts;

  // prepare container
  container.replaceChildren();
  // injectScopedStyles(container);

  const wrapper = createElement("div", { class: "seating-wrapper" }, []);
  container.appendChild(wrapper);

  // Controls
  const controls = createElement("div", { class: "seating-controls" }, []);
  const btnZoomIn = Button("+", "zoom-in", { click: () => zp.zoomIn() }, "buttonx");
  const btnZoomOut = Button("−", "zoom-out", { click: () => zp.zoomOut() }, "buttonx");
  const btnReset = Button("Reset", "zoom-reset", { click: () => zp.reset() }, "buttonx");

  // Legend
  const legend = createElement("div", { style: "margin-left:auto; display:flex; gap:8px; align-items:center;" }, []);
  priceRanges.forEach(r => {
    const item = createElement("div", { class: "legend-item" }, [
      createElement("span", { class: "legend-swatch", style: `background:${r.color};` }, []),
      `${r.min}-${r.max}`
    ]);
    legend.appendChild(item);
  });

  controls.append(btnZoomIn, btnZoomOut, btnReset, legend);
  wrapper.appendChild(controls);

  // SVG container
  const svgWrap = createElement("div", { class: "seating-svg-wrap" }, []);
  wrapper.appendChild(svgWrap);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgWrap.appendChild(svg);

  const gRoot = document.createElementNS(svgNS, "g");
  gRoot.setAttribute("class", "seating-root");
  svg.appendChild(gRoot);

  // tooltip element (HTML)
  const tooltip = createElement("div", { class: "seating-tooltip" }, []);
  document.body.appendChild(tooltip);

  // selected seats
  const selected = new Map();

  // draw helpers
  function drawStage() {
    if (!stage) {
return;
}
    const st = document.createElementNS(svgNS, "rect");
    st.setAttribute("x", stage.x - stage.width / 2);
    st.setAttribute("y", stage.y);
    st.setAttribute("width", stage.width);
    st.setAttribute("height", stage.height);
    st.setAttribute("rx", stage.rx || 0);
    st.setAttribute("fill", "#111");
    st.setAttribute("opacity", 0.08);
    svg.appendChild(st);

    const stLabel = document.createElementNS(svgNS, "text");
    stLabel.setAttribute("x", stage.x);
    stLabel.setAttribute("y", stage.y + stage.height * 0.75);
    stLabel.setAttribute("text-anchor", "middle");
    stLabel.setAttribute("font-size", "14");
    stLabel.setAttribute("fill", "#333");
    stLabel.textContent = "STAGE";
    svg.appendChild(stLabel);
  }

  function drawScreen() {
    if (!screen) {
return;
}
    const scr = document.createElementNS(svgNS, "rect");
    scr.setAttribute("x", screen.x - screen.width / 2);
    scr.setAttribute("y", screen.y);
    scr.setAttribute("width", screen.width);
    scr.setAttribute("height", screen.height);
    scr.setAttribute("fill", "#444");
    scr.setAttribute("opacity", 0.15);
    svg.appendChild(scr);
  }

  function drawCranes() {
    cranes.forEach(c => {
      const cr = document.createElementNS(svgNS, "rect");
      cr.setAttribute("x", c.x);
      cr.setAttribute("y", c.y);
      cr.setAttribute("width", c.width);
      cr.setAttribute("height", c.height);
      cr.setAttribute("fill", "#666");
      cr.setAttribute("opacity", 0.3);
      svg.appendChild(cr);
    });
  }

  function drawEntries() {
    entries.forEach(e => {
      const en = document.createElementNS(svgNS, "rect");
      en.setAttribute("x", e.x);
      en.setAttribute("y", e.y);
      en.setAttribute("width", e.width);
      en.setAttribute("height", e.height);
      en.setAttribute("fill", "#2ecc71");
      svg.appendChild(en);
    });
  }

  function drawWalkways() {
    walkways.forEach(w => {
      const wl = document.createElementNS(svgNS, "line");
      wl.setAttribute("x1", w.x1);
      wl.setAttribute("y1", w.y1);
      wl.setAttribute("x2", w.x2);
      wl.setAttribute("y2", w.y2);
      wl.setAttribute("stroke", "#ccc");
      wl.setAttribute("stroke-width", 20);
      wl.setAttribute("stroke-linecap", "round");
      svg.appendChild(wl);
    });
  }

  /**
   * Draw seats using a DocumentFragment to batch DOM work.
   * Each seat group (g) will have classes applied depending on state.
   */
  function drawSeats() {
    const frag = document.createDocumentFragment();
    const seatsContainer = document.createElementNS(svgNS, "g");
    seatsContainer.setAttribute("class", "seats-container");
    // build seats into container, then append container to fragment and DOM
    sections.forEach(section => {
      section.rows.forEach(row => {
        row.seats.forEach(seat => {
          const cx = seat.cx;
          const cy = seat.cy;

          const sg = document.createElementNS(svgNS, "g");
          sg.setAttribute("data-seat-id", seat.id);
          sg.setAttribute("transform", `translate(${cx}, ${cy})`);

          // apply state classes early
          if (seat.status === "sold") {
sg.classList.add("seat-sold");
} else if (seat.obstructed) {
sg.classList.add("seat-obstructed");
}

          const circle = document.createElementNS(svgNS, "circle");
          circle.setAttribute("r", seatRadius);
          circle.setAttribute("cx", 0);
          circle.setAttribute("cy", 0);
          circle.setAttribute("fill", seatColor(seat, priceRanges));
          circle.setAttribute("stroke", "#fff");
          circle.setAttribute("stroke-width", "1.25");
          circle.setAttribute("cursor", seat.status === "sold" ? "not-allowed" : "pointer");
          sg.appendChild(circle);

          const t = document.createElementNS(svgNS, "text");
          t.setAttribute("y", 4);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("font-size", Math.max(8, seatRadius - 1));
          t.setAttribute("fill", "#fff");
          t.textContent = seat.label;
          sg.appendChild(t);

          // events
          sg.addEventListener("mouseenter", (ev) => {
            tooltip.style.display = "block";
            updateTooltip(tooltip, section, row, seat);
          });
          sg.addEventListener("mousemove", (ev) => {
            tooltip.style.left = (ev.pageX + 12) + "px";
            tooltip.style.top = (ev.pageY + 12) + "px";
          });
          sg.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
          });

          sg.addEventListener("click", () => {
            if (!selectable || seat.status === "sold") {
return;
}
            toggleSeatSelection({
              selectedMap: selected,
              seatId: seat.id,
              sg,
              seat,
              row,
              section,
              maxSelection,
              priceRanges,
              onSelect
            });
            updateSelectionPanel();
          });

          seatsContainer.appendChild(sg);
        });
      });
    });

    frag.appendChild(seatsContainer);
    // append once
    gRoot.appendChild(frag);
  }

  // draw static elements
  drawStage();
  drawScreen();
  drawCranes();
  drawEntries();
  drawWalkways();
  drawSeats();

  // Footer & Buy
  const footer = createElement("div", { class: "seating-footer" }, []);
  const selectedList = createElement("div", { class: "selected-list" }, [`Selected: 0`]);
  const buyBtn = Button("Reserve / Buy", "buy-seats", {
    click: async () => {
      if (!selected.size) {
return Notify("No seats selected.", { type: "error" });
}
      const payload = Array.from(selected.values()).map(v => ({
        seatId: v.seat.id,
        sectionId: v.section.id,
        rowId: v.row.id,
        price: v.seat.price
      }));
      const res = await reserveSeats(payload);
      if (res?.ok) {
        // mark seats as sold in DOM
        selected.forEach(({ seat }) => {
          const node = svg.querySelector(`[data-seat-id="${seat.id}"]`);
          if (node) {
            node.classList.remove("seat-selected");
            node.classList.add("seat-sold");
            const circle = node.querySelector("circle");
            if (circle) {
              circle.setAttribute("fill", "#bbb");
              circle.setAttribute("stroke", "#999");
              circle.setAttribute("cursor", "not-allowed");
            }
          }
        });
        selected.clear();
        updateSelectionPanel();
      }
    }
  }, "primary");

  footer.append(selectedList, buyBtn);
  wrapper.appendChild(svgWrap);
  wrapper.appendChild(footer);

  function updateSelectionPanel() {
    const count = selected.size;
    const total = Array.from(selected.values()).reduce((acc, v) => acc + (v.seat.price || 0), 0);
    selectedList.replaceChildren();
    selectedList.appendChild(createElement("div", {}, [`Selected: ${count}`]));
    selectedList.appendChild(createElement("div", {}, [`Total: ${total} ${seatingData.currency || ""}`]));
  }

  // create zoom/pan controls and wire buttons
  const zp = createZoomPan(svg, { width, height });

  // expose API to caller
  const api = {
    getSelected: () => Array.from(selected.values()).map(v => v.seat),
    clearSelection: () => {
      selected.forEach(({ seat, sg }) => {
        if (sg) {
          sg.classList.remove("seat-selected");
          const circle = sg.querySelector("circle");
          if (circle) {
            circle.setAttribute("fill", seatColor(seat, priceRanges));
            circle.setAttribute("stroke", "#fff");
            circle.setAttribute("stroke-width", "1.25");
            circle.setAttribute("cursor", seat.status === "sold" ? "not-allowed" : "pointer");
          }
        }
      });
      selected.clear();
      updateSelectionPanel();
    },
    zoomIn: () => zp.zoomIn(),
    zoomOut: () => zp.zoomOut(),
    reset: () => zp.reset()
  };

  // initial state
  updateSelectionPanel();

  return api;
}

/**
 * Example showing function - uses generateStadiumLayout and the refactored render
 */
export function showSeatingMap() {
  const seatingData = generateStadiumLayout({
    sections: 4,
    rowsPerSection: 6,
    seatsPerRow: 12,
    centerX: 600,
    centerY: 850,
    startAngle: -90,
    endAngle: 90,
    priceBase: 70,
    currency: "USD"
  });

  const options = {
    selectable: true,
    maxSelection: 5,
    seatRadius: 9,
    onSelect: selected => {}
  };

  const seatMap = createElement("div", { class: "seatmap-container" }, []);
  renderSeatingMap(seatMap, seatingData, options);
  return createElement("section", { class: "seatingcon" }, [seatMap]);
}
