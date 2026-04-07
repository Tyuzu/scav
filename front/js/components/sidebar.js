import "../../css/ui/controlcenter.css";
import { createElement } from "../components/createElement.js";
import { navigate } from "../routes/index.js";

let controlCenter = null;
let isOpen = false;

/* ---------------------------------- */
/* Config */
/* ---------------------------------- */

const LINKS = [
  { href: "/crops", label: "Crops" },
  { href: "/farms", label: "Farms" },
  { href: "/dash", label: "Dash" },
  { href: "/recipes", label: "Recipes" },
  { href: "/products", label: "Products" },
  { href: "/tools", label: "Tools" },
  { href: "/music", label: "Music" },
  { href: "/merechats", label: "TextChat" }
];

const TILES = [
  { label: "Weather", value: "Clear, 22°C" }
];

/* ---------------------------------- */
/* Build */
/* ---------------------------------- */

function buildControlCenter() {
  if (controlCenter) {
return;
}

  const personalHub = buildPersonalHub();
  const liveTiles = buildTiles();
  const navGrid = buildNavGrid();

  const scrollArea = createElement("div", { class: "cc-scroll" }, [
    createElement("div", { class: "cc-handle" }),
    personalHub,
    liveTiles,
    navGrid
  ]);

  const closeBtn = createElement(
    "button",
    { class: "cc-close", type: "button", "aria-label": "Close" },
    ["✕"]
  );

  controlCenter = createElement("div", { class: "control-center hidden" }, [
    closeBtn,
    scrollArea
  ]);

  document.getElementById("app").appendChild(controlCenter);

  attachEventDelegation();
  attachGestureHandling();
}

/* ---------------------------------- */
/* Sections */
/* ---------------------------------- */

function buildPersonalHub() {
  return createElement("div", { class: "cc-personal-hub" }, [
    createElement("div", { class: "cc-avatar" }),
    createElement("div", { class: "cc-profile-name" }, ["Guest User"]),
    createElement("div", { class: "cc-btn-row" }, [
      createElement(
        "button",
        { class: "cc-small-btn", "data-nav": "/profile" },
        ["Edit Profile"]
      ),
      createElement(
        "button",
        { class: "cc-small-btn", "data-action": "logout" },
        ["Logout"]
      )
    ])
  ]);
}

function buildTiles() {
  const tiles = TILES.map(tile =>
    createElement("div", { class: "cc-live-tile" }, [
      createElement("div", { class: "cc-tile-label" }, [tile.label]),
      createElement("div", { class: "cc-tile-value" }, [tile.value])
    ])
  );

  return createElement("div", { class: "cc-tiles" }, tiles);
}

function buildNavGrid() {
  const buttons = LINKS.map(link =>
    createElement(
      "button",
      {
        class: "cc-nav-link",
        type: "button",
        "data-nav": link.href
      },
      [link.label]
    )
  );

  return createElement("div", { class: "cc-nav-grid" }, buttons);
}

/* ---------------------------------- */
/* Event Handling (Delegated) */
/* ---------------------------------- */

function attachEventDelegation() {
  controlCenter.addEventListener("click", e => {
    const navTarget = e.target.closest("[data-nav]");
    if (navTarget) {
      navigate(navTarget.dataset.nav);
      closeControlCenter();
      return;
    }

    const actionTarget = e.target.closest("[data-action]");
    if (actionTarget?.dataset.action === "logout") {
      handleLogout();
      return;
    }

    if (e.target.closest(".cc-close")) {
      closeControlCenter();
    }
  });
}

function handleLogout() {
  // Replace with real logout logic
  console.log("Logging out...");
}

/* ---------------------------------- */
/* Gesture Handling (Pointer Events) */
/* ---------------------------------- */

function attachGestureHandling() {
  let startY = 0;
  let currentY = 0;
  let dragging = false;

  controlCenter.addEventListener("pointerdown", e => {
    dragging = true;
    startY = e.clientY;
  });

  controlCenter.addEventListener("pointermove", e => {
    if (!dragging) {
return;
}

    currentY = e.clientY;
    const diff = Math.max(0, currentY - startY);

    if (diff > 0) {
      controlCenter.style.transform = `translateY(${diff}px)`;
    }
  });

  controlCenter.addEventListener("pointerup", () => {
    if (!dragging) {
return;
}

    dragging = false;
    const diff = currentY - startY;

    if (diff > 100) {
closeControlCenter();
} else {
controlCenter.style.transform = "";
}
  });

  controlCenter.addEventListener("pointercancel", () => {
    dragging = false;
    controlCenter.style.transform = "";
  });
}

/* ---------------------------------- */
/* Open / Close */
/* ---------------------------------- */

export function toggleControlCenter() {
  buildControlCenter();
  isOpen ? closeControlCenter() : openControlCenter();
}

function openControlCenter() {
  if (isOpen) {
return;
}

  isOpen = true;
  controlCenter.classList.remove("hidden");

  requestAnimationFrame(() => {
    controlCenter.classList.add("open");
  });

  document.body.style.overflow = "hidden";
}

function closeControlCenter() {
  if (!isOpen) {
return;
}

  isOpen = false;
  controlCenter.classList.remove("open");

  const onTransitionEnd = () => {
    controlCenter.classList.add("hidden");
    controlCenter.style.transform = "";
    controlCenter.removeEventListener("transitionend", onTransitionEnd);
  };

  controlCenter.addEventListener("transitionend", onTransitionEnd);

  document.body.style.overflow = "";
}

export { toggleControlCenter as toggleSidebar };