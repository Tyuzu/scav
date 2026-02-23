import { createTabs } from "../../../components/ui/createTabs.js";
import { createFilterPanel } from "./createFilterPanel.js";
import { renderCategoryItems } from "./renderCategoryItems.js";
import {debounce} from "../../../utils/deutils.js";

export function showCategoryBrowser(container) {
    container.textContent = "";

    const filters = {
        minPrice: "",
        maxPrice: "",
        inStock: false,
        region: "",
        lat: null,
        lng: null
    };

    const onFilterChange = debounce(() => {
        const activeTab = document.querySelector(".tab-content.active");
        if (activeTab) {
            const category = activeTab.id.replace("-tab", "");
            renderCategoryItems(activeTab, category, filters);
        }
    }, 300);

    // const filterPanel = createFilterPanel(filters, onFilterChange);

    const tabs = [
        { id: "fruits-tab", title: "🍎 Fruits", render: el => renderCategoryItems(el, "Fruits", filters) },
        { id: "vegetables-tab", title: "🥕 Vegetables", render: el => renderCategoryItems(el, "Vegetables", filters) },
        { id: "grains-tab", title: "🌾 Grains", render: el => renderCategoryItems(el, "Grains", filters) },
        { id: "dairy-tab", title: "🥛 Dairy", render: el => renderCategoryItems(el, "Dairy", filters) },
        { id: "fishery-tab", title: "🐟 Fishery", render: el => renderCategoryItems(el, "Fishery", filters) },
        { id: "poultry-tab", title: "🐔 Poultry", render: el => renderCategoryItems(el, "Poultry", filters) },
        { id: "flowers-tab", title: "🌱 Flowers", render: el => renderCategoryItems(el, "Flowers", filters) },
        { id: "others-tab", title: "🌱 Others", render: el => renderCategoryItems(el, "Others", filters) }
    ];

    const tabComponent = createTabs(tabs);
    // container.append(filterPanel, tabComponent);
    container.append(tabComponent);
}

// function debounce(fn, delay) {
//     let timeout;
//     return function (...args) {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => fn.apply(this, args), delay);
//     };
// }

