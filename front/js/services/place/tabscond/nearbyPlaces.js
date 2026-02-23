import { apiFetch } from "../../../api/api";
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

let allPlaces = [];
let activeCategory = "All";
let placeCardsCache = {}; // category => array of card elements

let currentView = "grid"; // "grid" or "list"

export async function displayPlaceNearby(container, placeId) {
    clearElement(container);

    const nearbyPlaces = await apiFetch(`/suggestions/places/nearby?place=${placeId}&lat=28.6139&lng=77.2090`);
    if (!Array.isArray(nearbyPlaces) || nearbyPlaces.length === 0) {
        container.appendChild(createElement("p", {}, ["No nearby Places found."]));
        return;
    }

    allPlaces = nearbyPlaces;
    const categories = getCategories(allPlaces);

    // Top controls: filter + view toggle
    const controlsBar = createElement("div", { class: "places-controls" }, [
        buildFilterBar(categories),
        buildViewToggle()
    ]);

    const contentWrapper = createElement("div", { class: `places-wrapper ${currentView}`, id: "places-wrapper" }, []);

    container.appendChild(controlsBar);
    container.appendChild(contentWrapper);

    buildPlaceCardsCache();
    showCategory(activeCategory, contentWrapper);
}

function buildViewToggle() {
    const toggleWrapper = createElement("div", { class: "view-toggle" }, []);

    const gridBtn = createElement("button", 
        currentView === "grid" ? { class: "active" } : {}, 
        ["🔳 Grid"]
    );

    const listBtn = createElement("button", 
        currentView === "list" ? { class: "active" } : {}, 
        ["📋 List"]
    );

    gridBtn.addEventListener("click", () => {
        if (currentView !== "grid") {
            currentView = "grid";
            updateView();
        }
    });

    listBtn.addEventListener("click", () => {
        if (currentView !== "list") {
            currentView = "list";
            updateView();
        }
    });

    toggleWrapper.appendChild(gridBtn);
    toggleWrapper.appendChild(listBtn);
    return toggleWrapper;
}


function updateView() {
    const wrapper = document.getElementById("places-wrapper");
    if (wrapper) {
        wrapper.classList.remove("grid", "list");
        wrapper.classList.add(currentView);
    }

    // Update toggle button styles
    const toggle = document.querySelector(".view-toggle");
    if (toggle) {
        toggle.querySelectorAll("button").forEach(btn => {
            btn.classList.toggle("active", 
                (currentView === "grid" && btn.textContent.includes("Grid")) ||
                (currentView === "list" && btn.textContent.includes("List"))
            );
        });
    }
}


function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function getCategories(places) {
    return ["All", ...new Set(places.map(p => p.category || "Uncategorized"))];
}

function buildFilterBar(categories) {
    const filterBar = createElement("div", { id: "category-filter", class: "filter-bar" }, []);
    categories.forEach(category => {
        const button = createElement("button", {
            class: category === activeCategory ? "filter-button buttonx active" : "filter-button buttonx"
        }, [category]);

        button.addEventListener("click", () => {
            if (activeCategory === category) return;
            activeCategory = category;
            updateFilterButtons(filterBar, category);
            const wrapper = document.getElementById("places-wrapper");
            if (wrapper) showCategory(category, wrapper);
        });

        filterBar.appendChild(button);
    });
    return filterBar;
}

function updateFilterButtons(filterBar, selectedCategory) {
    [...filterBar.children].forEach(btn => {
        btn.classList.toggle("active", btn.textContent === selectedCategory);
    });
}

function buildPlaceCardsCache() {
    placeCardsCache = {};

    const allCategoryCards = allPlaces.map((place, index) => placeCard(place, index));
    placeCardsCache["All"] = allCategoryCards;

    const categories = getCategories(allPlaces).filter(c => c !== "All");
    categories.forEach(category => {
        placeCardsCache[category] = allCategoryCards.filter(card =>
            card.dataset.category === category
        );
    });
}

function showCategory(category, wrapper) {
    clearElement(wrapper);

    const cards = placeCardsCache[category] || [];
    if (cards.length === 0) {
        wrapper.appendChild(createElement("p", {}, ["No places available in this category."]));
        return;
    }

    cards.forEach(card => {
        wrapper.appendChild(card);
    });
}

function placeCard(place, index = 0) {
    // const imgSrc = place.imageUrl || "/images/place-placeholder.jpg";
    const imgSrc = resolveImagePath(EntityType.PLACE, PictureType.THUMB, place.banner);

    const card = createElement("div", {
        class: "nearby-item",
        "data-category": place.category || "Uncategorized"
    }, [
        createElement("div", { class: "nearby-image" }, [
            Imagex({ src: imgSrc, alt: place.name || "Place Image" }, [])
        ]),
        createElement("div", { class: "nearby-details" }, [
            createElement("h4", {}, [place.name || "Unnamed Place"]),
            createElement("p", {}, [`Category: ${place.category || "Unknown"}`]),
            createElement("p", {}, [`Capacity: ${place.capacity ?? 1}`]),
            createElement("p", {}, [`⭐ Review Count: ${place.reviewCount ?? 0}`]),
        ]),
        Button("View Details", `nearby-btn-${index}`, {
            click: () => navigate(`/place/${place.placeid}`)
        }),
    ]);

    return card;
}
