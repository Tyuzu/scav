import { createElement } from "../../../components/createElement.js";

export function createFilterPanel(filters, onChange) {
    const wrapper = createElement("div", { class: "filter-panel" });

    const minPrice = createElement("input", { type: "number", placeholder: "Min Price" });
    const maxPrice = createElement("input", { type: "number", placeholder: "Max Price" });
    const stockCheckbox = createElement("input", { type: "checkbox" });
    const regionInput = createElement("input", { type: "text", placeholder: "Region (optional)" });
    const geoBtn = createElement("button", {}, ["📍 Near Me"]);

    const inputs = [minPrice, maxPrice, stockCheckbox, regionInput];
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            filters.minPrice = minPrice.value;
            filters.maxPrice = maxPrice.value;
            filters.inStock = stockCheckbox.checked;
            filters.region = regionInput.value.trim();
            onChange();
        });
    });

    geoBtn.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition(
            pos => {
                filters.lat = pos.coords.latitude;
                filters.lng = pos.coords.longitude;
                onChange();
            },
            err => {
                alert("Could not retrieve location.");
                console.error(err);
            }
        );
    });

    wrapper.append(
        createElement("label", {}, ["Min ₹", minPrice]),
        createElement("label", {}, ["Max ₹", maxPrice]),
        createElement("label", {}, ["In Stock Only", stockCheckbox]),
        createElement("label", {}, ["Region", regionInput]),
        geoBtn
    );

    return wrapper;
}
