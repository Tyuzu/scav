// farmFilters.js
import { createElement } from "../../../components/createElement.js";
import { createOption } from "../../../components/ui/createOption.mjs";

export function createFilterControls(state, onFilterChange) {
    const container = createElement("div", { class: "farm__filters" });

    const searchInput = createElement("input", {
        type: "text",
        placeholder: "🔍 Search farms…",
        class: "farm__search"
    });

    const sortSelect = createElement("select", { class: "farm__sort" });
    [
        ["", "Sort by…"],
        ["name-asc", "Name A→Z"],
        ["name-desc", "Name Z→A"],
        ["rating-desc", "Rating ↓"],
        ["rating-asc", "Rating ↑"]
    ].forEach(([val, label]) =>
        sortSelect.append(createOption(val, label))
    );

    const locationInput = createElement("input", {
        type: "text",
        placeholder: "📍 Filter by location",
        class: "farm__location"
    });

    const availToggle = createElement("input", {
        type: "checkbox"
    });

    const availLabel = createElement("label", {}, [
        "🟢 Available Only ",
        availToggle
    ]);

    searchInput.oninput = () => {
        state.searchKeyword = searchInput.value.toLowerCase().trim();
        onFilterChange();
    };

    locationInput.oninput = () => {
        state.locationFilter = locationInput.value.toLowerCase().trim();
        onFilterChange();
    };

    sortSelect.onchange = () => {
        if (!sortSelect.value) {
            state.sortBy = "";
            state.sortDir = "";
        } else {
            const [key, dir] = sortSelect.value.split("-");
            state.sortBy = key;
            state.sortDir = dir;
        }
        onFilterChange();
    };

    availToggle.onchange = () => {
        state.onlyAvailable = availToggle.checked;
        onFilterChange();
    };

    container.append(
        searchInput,
        sortSelect,
        locationInput,
        availLabel
    );

    return container;
}

export function applyFiltersAndSort(farms, state) {
    let result = farms.slice();

    if (state.searchKeyword) {
        result = result.filter(f =>
            (f.name || "").toLowerCase().includes(state.searchKeyword)
        );
    }

    if (state.locationFilter) {
        result = result.filter(f =>
            (f.location || "").toLowerCase().includes(state.locationFilter)
        );
    }

    if (state.onlyAvailable) {
        result = result.filter(f => Boolean(f.available));
    }

    if (state.sortBy) {
        result.sort((a, b) => {
            let res = 0;

            if (state.sortBy === "name") {
                res = (a.name || "").localeCompare(b.name || "");
            }

            if (state.sortBy === "rating") {
                res = (a.rating ?? 0) - (b.rating ?? 0);
            }

            return state.sortDir === "asc" ? res : -res;
        });
    }

    return result;
}
