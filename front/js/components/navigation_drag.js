import { navigate } from "../routes/index.js";

/** Highlight current active link */
export const highlightActiveNav = (path) => {
    document.querySelectorAll(".navigation__link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === path);
    });
};

/** Handle navigation */
const handleNavigation = (event, href) => {
    event.preventDefault();
    if (!href) return console.error("🚨 handleNavigation received null href!");
    navigate(href);
};

/** Save nav order in localStorage */
const saveNavOrder = (order) => localStorage.setItem("navOrder", JSON.stringify(order));

/** Get nav order from localStorage */
const getNavOrder = () => {
    const stored = localStorage.getItem("navOrder");
    return stored ? JSON.parse(stored) : null;
};

/** Create one navigation item */
const createNavItem = (href, label) => {
    const li = document.createElement("li");
    li.className = "navigation__item";
    li.setAttribute("draggable", "true");

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.className = "navigation__link";
    anchor.textContent = label;
    anchor.addEventListener("click", (e) => handleNavigation(e, href));

    li.appendChild(anchor);
    return li;
};

/** Enable drag & drop only when toggle is checked */
const enableDragDrop = (ul, toggle) => {
    let draggingEl = null;
    const placeholder = document.createElement("li");
    placeholder.className = "navigation__placeholder";

    const onDragStart = (e) => {
        if (!toggle.checked) return;
        draggingEl = e.target.closest("li");
        draggingEl.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragEnd = () => {
        if (draggingEl) draggingEl.classList.remove("dragging");
        draggingEl = null;
        placeholder.remove();
        // save order
        const order = Array.from(ul.children)
            .filter(el => el !== placeholder)
            .map(el => el.querySelector("a").getAttribute("href"));
        saveNavOrder(order);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        if (!toggle.checked) return;
        const target = e.target.closest("li");
        if (!target || target === draggingEl || target === placeholder) return;

        const rect = target.getBoundingClientRect();
        const next = (e.clientX - rect.left) / rect.width > 0.5; // horizontal
        ul.insertBefore(placeholder, next ? target.nextSibling : target);
    };

    const onDrop = (e) => {
        e.preventDefault();
        if (!toggle.checked) return;
        if (placeholder.parentNode) ul.insertBefore(draggingEl, placeholder);
        placeholder.remove();
    };

    ul.addEventListener("dragstart", onDragStart);
    ul.addEventListener("dragend", onDragEnd);
    ul.addEventListener("dragover", onDragOver);
    ul.addEventListener("drop", onDrop);
};

/** Create navigation bar */
const createNav = () => {
    const defaultNavItems = [
        { href: "/grocery", label: "Grocery" },
        { href: "/places", label: "Places" },
        { href: "/events", label: "Events" },
        { href: "/baitos", label: "Baito" },
        { href: "/baitos/hire", label: "Hire" },
        { href: "/social", label: "Social" },
        { href: "/posts", label: "Posts" },
        { href: "/itinerary", label: "Itinerary" },
        { href: "/recipes", label: "Recipes" },
        { href: "/artists", label: "Artists" },
    ];

    const savedOrder = getNavOrder();
    let navItems = defaultNavItems;
    if (savedOrder) {
        navItems = savedOrder
            .map(href => defaultNavItems.find(item => item.href === href))
            .filter(Boolean);
        defaultNavItems.forEach(item => {
            if (!navItems.find(i => i.href === item.href)) navItems.push(item);
        });
    }

    const nav = document.createElement("div");
    nav.className = "navigation";

    const toggle = document.createElement("input");
    toggle.className = "toggle";
    toggle.type = "checkbox";
    toggle.id = "more";
    toggle.setAttribute("aria-hidden", "true");
    toggle.setAttribute("tabindex", "-1");

    const inner = document.createElement("div");
    inner.className = "navigation__inner";

    const ul = document.createElement("ul");
    ul.className = "navigation__list horizontal";

    navItems.forEach(({ href, label }) => ul.appendChild(createNavItem(href, label)));

    enableDragDrop(ul, toggle);

    const toggleLabelWrapper = document.createElement("div");
    toggleLabelWrapper.className = "navigation__toggle";

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "navigation__link";
    toggleLabel.setAttribute("for", "more");
    toggleLabel.setAttribute("aria-hidden", "true");
    toggleLabel.innerText = "More";

    toggleLabelWrapper.appendChild(toggleLabel);
    inner.appendChild(ul);
    inner.appendChild(toggleLabelWrapper);
    nav.appendChild(toggle);
    nav.appendChild(inner);

    highlightActiveNav(window.location.pathname);

    return nav;
};

export { createNav, createNavItem };
