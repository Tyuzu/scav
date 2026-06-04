import { SEARCH_URL } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";
import { createTabs } from "../../components/ui/createTabs.js";
import { createElement } from "../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { searchSVG } from "../../components/svgs.js";

let currentTab = "all";
let searchQuery = "";

/* -----------------------------
   STATE (autocomplete control)
------------------------------*/
let autocompleteController = null;
const autocompleteCache = new Map();

/* -----------------------------
   UTILITIES
------------------------------*/
function debounce(fn, delay = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

function formatDate(dateString) {
    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
}

function renderEmpty(container) {
    container.appendChild(
        createElement("p", {}, ["No results found."])
    );
}

/* -----------------------------
   MAIN ENTRY
------------------------------*/
export async function displaySearchForm(container) {
    container.textContent = "";

    const searchContainer = createElement("div", { class: "search-container" });

    /* ---------------- SEARCH BAR ---------------- */
    const searchBar = createElement("div", { class: "d3" });

    const searchInput = createElement("input", {
        id: "search-query",
        placeholder: "Search anything...",
        class: "search-field"
    });

    const searchButton = createIconButton({
        svgMarkup: searchSVG,
        classSuffix: "search-btn",
    });

    const autocompleteList = createElement("ul", {
        id: "autocomplete-list",
        class: "autocomplete-list"
    });

    searchBar.append(searchInput, searchButton);

    /* ---------------- TABS ---------------- */
    const tabsData = [
        { id: "all", title: "All" },
        { id: "events", title: "Events" },
        { id: "places", title: "Places" },
        { id: "feedposts", title: "Social" },
        { id: "merch", title: "Merch" },
        { id: "blogposts", title: "Posts" },
        { id: "farms", title: "Farms" },
        { id: "songs", title: "Songs" },
        { id: "users", title: "Users" },
        { id: "recipes", title: "Recipes" },
        { id: "products", title: "Products" },
        { id: "menu", title: "Menu" },
        { id: "media", title: "Media" },
        { id: "crops", title: "Crops" },
        { id: "baitoworkers", title: "Workers" },
        { id: "baitos", title: "Baitos" },
        { id: "artists", title: "Artists" },
    ];

    const tabsUI = createTabs(
        tabsData.map(tab => ({
            ...tab,
            render: async (tabContainer) => {
                if (!searchQuery) {
                    return;
                }
                await fetchSearchResults(tab.id, searchQuery, tabContainer);
            }
        })),
        "search-tabs",
        "all",
        (tabId) => {
            currentTab = tabId;
        }
    );

    searchContainer.append(searchBar, autocompleteList, tabsUI);
    container.appendChild(searchContainer);

    /* ---------------- EVENTS ---------------- */

    searchButton.addEventListener("click", () => {
        searchQuery = searchInput.value.trim();

        if (!searchQuery) {
            return Notify("Please enter a search query.", {
                type: "info",
                duration: 3000
            });
        }

        refreshCurrentTab();
    });

    searchInput.addEventListener(
        "input",
        debounce(handleAutocomplete, 250)
    );

    searchInput.addEventListener("keydown", handleKeyboardNavigation);

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            searchQuery = searchInput.value.trim();

            if (searchQuery) {
                refreshCurrentTab();
            }

            autocompleteList.textContent = "";
        }
    });

    document.addEventListener("click", (e) => {
        if (!searchContainer.contains(e.target)) {
            autocompleteList.textContent = "";
        }
    });

    /* ---------------- CORE ---------------- */

    function refreshCurrentTab() {
        const active = document.querySelector(".tab-content.active");

        if (active) {
            fetchSearchResults(currentTab, searchQuery, active);
        }
    }
}

/* -----------------------------
   AUTOCOMPLETE
------------------------------*/
async function handleAutocomplete(event) {
    const query = event.target.value.trim();
    const list = document.getElementById("autocomplete-list");

    if (!list) return;

    list.textContent = "";

    if (!query) return;

    if (autocompleteCache.has(query)) {
        renderSuggestions(autocompleteCache.get(query), list, query);
        return;
    }

    try {
        autocompleteController?.abort();
        autocompleteController = new AbortController();

        const res = await fetch(
            `${SEARCH_URL}/ac?prefix=${encodeURIComponent(query)}`,
            { signal: autocompleteController.signal }
        );

        let suggestions = await res.json();

        if (!Array.isArray(suggestions)) {
            suggestions = [];
        }

        autocompleteCache.set(query, suggestions);
        renderSuggestions(suggestions, list, query);

    } catch (err) {
        if (err.name !== "AbortError") {
            console.error("Autocomplete error:", err);
        }
    }
}

function renderSuggestions(suggestions, list, query) {
    list.textContent = "";

    if (!suggestions.length) return;

    suggestions.forEach(s => {
        const li = createElement("li", {
            class: "autocomplete-item"
        }, [s]);

        li.addEventListener("click", () => {
            document.getElementById("search-query").value = s;
            list.textContent = "";
            searchQuery = s;
            refreshCurrentTab();
        });

        list.appendChild(li);
    });
}

/* -----------------------------
   KEYBOARD NAV
------------------------------*/
function handleKeyboardNavigation(event) {
    const list = document.getElementById("autocomplete-list");
    if (!list) return;

    const items = list.querySelectorAll(".autocomplete-item");
    if (!items.length) return;

    let index = Array.from(items)
        .findIndex(i => i.classList.contains("selected"));

    if (event.key === "ArrowDown") {
        index = (index + 1) % items.length;
    } else if (event.key === "ArrowUp") {
        index = (index - 1 + items.length) % items.length;
    } else if (event.key === "Enter") {
        if (index >= 0) items[index].click();
        event.preventDefault();
        return;
    } else {
        return;
    }

    items.forEach(i => i.classList.remove("selected"));
    if (index >= 0) items[index].classList.add("selected");
}

/* -----------------------------
   API
------------------------------*/
async function apiFetch(endpoint) {
    try {
        const res = await fetch(endpoint);

        if (!res.ok) {
            throw new Error("Request failed");
        }

        const text = await res.text();
        return text ? JSON.parse(text) : [];
    } catch (err) {
        Notify(`API error: ${err.message}`, {
            type: "error",
            duration: 3000
        });
        return [];
    }
}

async function fetchSearchResults(tabId, query, container) {
    container.textContent = "Loading...";

    try {
        const url = `${SEARCH_URL}/search/${tabId}?query=${encodeURIComponent(query)}`;
        const results = await apiFetch(url);

        displaySearchResults(tabId, results, container);

    } catch {
        Notify("Error fetching search results.", {
            type: "error",
            duration: 3000
        });
    }
}

/* -----------------------------
   RENDER RESULTS
------------------------------*/
function displaySearchResults(entityType, data, container) {
    container.textContent = "";

    if (entityType === "all" && data && typeof data === "object" && !Array.isArray(data)) {
        let has = false;

        for (const key in data) {
            const arr = data[key];

            if (Array.isArray(arr) && arr.length) {
                has = true;

                container.appendChild(
                    createElement("h2", {}, [capitalize(key)])
                );

                arr.forEach(item =>
                    container.appendChild(createCard(key, item))
                );
            }
        }

        if (!has) renderEmpty(container);
        return;
    }

    if (Array.isArray(data)) {
        if (!data.length) return renderEmpty(container);

        data.forEach(item =>
            container.appendChild(createCard(entityType, item))
        );
        return;
    }

    renderEmpty(container);
}

function createCard(entityType, item) {
    const card = createElement("div", {
        class: `result-card ${entityType}`
    });

    const header = createElement("div", { class: "result-header" });

    if (item.image) {
        header.appendChild(
            Imagex({
                src: resolveImagePath(
                    EntityType[entityType.toUpperCase()] || EntityType.POST,
                    PictureType.THUMB,
                    item.image
                ),
                alt: item.title || entityType,
                loading: "lazy",
                classes: "result-image"
            })
        );
    }

    header.appendChild(
        createElement("div", { class: "result-info" }, [
            createElement("h3", {}, [item.title || "No Title"])
        ])
    );

    const details = createElement("div", { class: "result-details" }, [
        createElement("em", {}, [
            item.description || "No description available."
        ]),
        createElement("small", {}, [
            `Created: ${formatDate(item.createdAt)}`
        ])
    ]);

    const footer = createElement("div", { class: "result-footer" });

    const id = item.id || item.entityid;

    if (id) {
        footer.appendChild(
            createElement("a", {
                href: `/${entityType}/${id}`,
                class: "btn",
                target: "_blank"
            }, ["View Details"])
        );
    }

    card.append(header, details);

    if (footer.children.length) {
        card.appendChild(footer);
    }

    return card;
}

/* -----------------------------
   HELPERS
------------------------------*/
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export { displaySearchForm as displaySearch };