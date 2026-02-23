import "../../../css/ui/FAB.css";
import { createNavItem } from "../navigation.js";
import { makeDraggable } from "../makeDraggable.js";

/** Floating Action Button (FAB) */
const FloatingActionButton = (icon, id, navItems = defaultNavItems) => {
    if (document.getElementById(id)) return;

    const fabContainer = document.createElement("div");
    fabContainer.className = "fab-container";

    const fab = document.createElement("button");
    fab.id = id;
    fab.className = "fab";
    fab.innerHTML = icon;

    // Accessibility attributes
    fab.setAttribute("aria-label", "Floating Action Button");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", `${id}-actions`);
    fab.setAttribute("role", "button");
    fab.setAttribute("tabindex", "0");

    const actionContainer = document.createElement("div");
    actionContainer.className = "fab-actions hidden";
    actionContainer.id = `${id}-actions`;

    // Generate Navigation for FAB
    createFabNav(actionContainer, navItems);

    let isDragging = false;

    // Toggle FAB menu
    const toggleFabMenu = () => {
        const isHidden = actionContainer.classList.toggle("hidden");
        fab.setAttribute("aria-expanded", (!isHidden).toString());
    };

    // FAB Click (ignore if dragging)
    fab.addEventListener("click", (e) => {
        if (!isDragging) {
            e.stopPropagation();
            toggleFabMenu();
        }
    });

    // Keyboard accessibility
    fab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fab.click();
        }
    });

    // Close menu when clicking outside
    const handleOutsideClick = (e) => {
        if (!fabContainer.contains(e.target)) {
            actionContainer.classList.add("hidden");
            fab.setAttribute("aria-expanded", "false");
        }
    };

    document.addEventListener("click", handleOutsideClick);

    // Drag detection integration
    fabContainer.addEventListener("dragstart", () => { isDragging = true; });
    fabContainer.addEventListener("dragend", () => {
        setTimeout(() => { isDragging = false; }, 100);
    });

    // Append elements (batching for performance)
    const fragment = document.createDocumentFragment();
    fragment.appendChild(actionContainer);
    fragment.appendChild(fab);
    fabContainer.appendChild(fragment);
    document.getElementById("app").appendChild(fabContainer);

    // Make draggable
    makeDraggable(fabContainer, id);
};

/** Default FAB Navigation Menu */
const defaultNavItems = [
    { href: "/home", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/places", label: "Places" },
    { href: "/feed", label: "Feed" },
    { href: "/forums", label: "Forums" },
    { href: "/livechat", label: "LiveChat" },
];

/** FAB Navigation Menu Generator */
const createFabNav = (actionContainer, navItems) => {
    const nav = document.createElement("nav");
    const ul = document.createElement("ul");
    ul.className = "hvflex";

    const fragment = document.createDocumentFragment();
    navItems.forEach((item) => fragment.appendChild(createNavItem(item.href, item.label)));

    ul.appendChild(fragment);
    nav.appendChild(ul);
    actionContainer.appendChild(nav);
};

export default FloatingActionButton;
export { FloatingActionButton };
