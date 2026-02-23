import { SEARCH_URL } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";
import { createTabs } from "../../components/ui/createTabs.js";
import { createElement } from "../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { searchSVG } from "../../components/svgs.js";


let currentTab = "all"; // Tracks active tab
let searchQuery = "";   // Tracks current query

export async function displaySearchForm(container) {
    container.textContent = "";

    const searchContainer = createElement("div", { class: "search-container" });

    // --- Search Bar
    const searchBar = createElement("div", { class: "d3" });

    const searchInput = createElement("input", {
        id: "search-query",
        placeholder: "Search anything...",
        required: true,
        class: "search-field"
    });

    const searchButton = createIconButton({
        svgMarkup:searchSVG,
        classSuffix:"search-btn",
    });

    const autocompleteList = createElement("ul", { id: "autocomplete-list", class: "autocomplete-list" });

    searchBar.append(searchInput, searchButton);

    // --- Tabs
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
                // Render results only if query exists
                if (searchQuery) await fetchSearchResults(tab.id, searchQuery, tabContainer);
            }
        })),
        "search-tabs",
        "all",
        (tabId) => { currentTab = tabId; }
    );

    searchContainer.append(searchBar, autocompleteList, tabsUI);
    container.appendChild(searchContainer);

    // --- Listeners
    searchButton.addEventListener("click", () => {
        searchQuery = searchInput.value.trim();
        if (!searchQuery) return Notify("Please enter a search query.", { type: "info", duration: 3000 });
        refreshCurrentTab();
    });

    searchInput.addEventListener("input", handleAutocomplete);
    searchInput.addEventListener("keydown", handleKeyboardNavigation);
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            searchQuery = searchInput.value.trim();
            if (searchQuery) refreshCurrentTab();
            autocompleteList.textContent = "";
        }
    });

    document.addEventListener("click", (e) => {
        if (!searchContainer.contains(e.target)) autocompleteList.textContent = "";
    });
}

// --- Refresh results in the currently active tab
function refreshCurrentTab() {
    const activeTabContainer = document.querySelector(".tab-content.active");
    if (activeTabContainer) fetchSearchResults(currentTab, searchQuery, activeTabContainer);
}

// --- Autocomplete logic
async function handleAutocomplete(event) {
    const query = event.target.value.trim();
    const autocompleteList = document.getElementById("autocomplete-list");
    autocompleteList.textContent = "";
    if (!query) return;

    try {
        const response = await fetch(`${SEARCH_URL}/ac?prefix=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        suggestions.forEach(suggestion => {
            const li = createElement("li", { class: "autocomplete-item" }, [suggestion]);
            li.addEventListener("click", () => {
                document.getElementById("search-query").value = suggestion;
                autocompleteList.textContent = "";
                searchQuery = suggestion;
                refreshCurrentTab();
            });
            autocompleteList.appendChild(li);
        });
    } catch (err) {
        console.error("Autocomplete error:", err);
    }
}

// --- Keyboard nav for autocomplete
function handleKeyboardNavigation(event) {
    const autocompleteList = document.getElementById("autocomplete-list");
    const items = autocompleteList.querySelectorAll(".autocomplete-item");
    if (!items.length) return;

    let index = Array.from(items).findIndex(item => item.classList.contains("selected"));

    if (event.key === "ArrowDown") index = (index + 1) % items.length;
    else if (event.key === "ArrowUp") index = (index - 1 + items.length) % items.length;
    else if (event.key === "Enter") {
        if (index >= 0) items[index].click();
        event.preventDefault();
        return;
    } else return;

    items.forEach(item => item.classList.remove("selected"));
    if (index >= 0) items[index].classList.add("selected");
}

// --- Fetch wrapper
async function apiFetch(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to fetch");
        const text = await response.text();
        return text ? JSON.parse(text) : [];
    } catch (err) {
        Notify(`API Fetch Error: ${err}`, { type: "error", duration: 3000 });
        return [];
    }
}

// --- Search request per tab
async function fetchSearchResults(tabId, query, container) {
    container.textContent = "";
    try {
        const url = `${SEARCH_URL}/search/${tabId}?query=${encodeURIComponent(query)}`;
        const results = await apiFetch(url);
        displaySearchResults(tabId, results, container);
    } catch (err) {
        Notify("Error fetching search results.", { type: "error", duration: 3000 });
    }
}

// --- Render results inside container
function displaySearchResults(entityType, data, container) {
    container.textContent = "";

    if (entityType === "all" && typeof data === "object" && !Array.isArray(data)) {
        const keys = Object.keys(data);
        let hasResults = false;

        keys.forEach(key => {
            if (Array.isArray(data[key]) && data[key].length) {
                hasResults = true;
                container.appendChild(createElement("h2", {}, [capitalizeFirstLetter(key)]));
                data[key].forEach(item => container.appendChild(createCard(key, item)));
            }
        });

        if (!hasResults) container.appendChild(createElement("p", {}, ["No results found."]));
    } else if (Array.isArray(data)) {
        if (!data.length) container.appendChild(createElement("p", {}, ["No results found."]));
        else data.forEach(item => container.appendChild(createCard(entityType, item)));
    } else container.appendChild(createElement("p", {}, ["No results found."]));
}

function createCard(entityType, item) {
    const card = createElement("div", { class: `result-card ${entityType}` });

    // --- Header ---
    const header = createElement("div", { class: "result-header" });
    if (item.image) {
        header.appendChild(Imagex({
            src: resolveImagePath(
                EntityType[entityType.toUpperCase()] || EntityType.POST,
                PictureType.THUMB,
                `${item.image}` // keep .png extension from your data
                // `${item.image}.png` // keep .png extension from your data
            ),
            alt: item.title || entityType,
            loading: "lazy",
            classes: "result-image"
        }));
    }

    const info = createElement("div", { class: "result-info" }, [
        createElement("h3", {}, [item.title || "No Title"])
    ]);
    header.appendChild(info);
    card.appendChild(header);

    // --- Details ---
    const details = createElement("div", { class: "result-details" }, [
        createElement("em", {}, [item.description || "No description available."]),
        createElement("small", {}, [`Created: ${new Date(item.createdAt).toLocaleDateString()}`])
    ]);
    card.appendChild(details);

    // --- Footer ---
    const footer = createElement("div", { class: "result-footer" });
    const entityId = item.id || item.entityid; // support both
    if (entityId) {
        footer.appendChild(createElement("a", {
            href: `/${entityType}/${entityId}`,
            class: "btn",
            target: "_blank"
        }, ["View Details"]));
    }
    if (footer.children.length) card.appendChild(footer);

    return card;
}


function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export { displaySearchForm as displaySearch };
