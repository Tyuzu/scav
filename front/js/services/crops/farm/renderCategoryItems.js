import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { displayCropCard } from "../crop/displayCropCard.js";

export async function renderCategoryItems(container, category, filters = {}) {
    container.textContent = "Loading...";

    try {
        const query = new URLSearchParams({
            category,
            minPrice: filters.minPrice || "",
            maxPrice: filters.maxPrice || "",
            inStock: filters.inStock ? "true" : "",
            region: filters.region || "",
            lat: filters.lat || "",
            lng: filters.lng || ""
        });

        const res = await apiFetch(`/crops?${query.toString()}`);
        if (!res.success || !res.crops?.length) {
            container.textContent = "No items found in this category.";
            return;
        }

        container.textContent = "";
        res.crops.forEach(crop => {
            const card = displayCropCard(crop);
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.textContent = "❌ Failed to load items.";
    }
}
