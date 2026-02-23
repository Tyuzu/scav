
import Button from "../components/base/Button.js";
import { createElement } from "../components/createElement.js";

// --- sort options by type ---
const sortOptionsByType = {
  events: [
    { value: "date", label: "Sort by Date" },
    { value: "price", label: "Sort by Price" },
    { value: "title", label: "Sort by Title" }
  ],
  places: [
    { value: "name", label: "Sort by Name" },
    { value: "capacity", label: "Sort by Capacity" },
    { value: "recent", label: "Sort by Recent" },
    { value: "popular", label: "Sort by Popularity" }
  ],
  default: [
    { value: "date", label: "Sort by Date" },
    { value: "title", label: "Sort by Title" },
    { value: "views", label: "Sort by Views" }
  ]
};

// --- reusable filter controls factory ---
export function createFilterControls({ type, items, onRender }) {
  const wrapper = createElement("div", { class: `${type}-controls` });

  // search input
  const searchInput = createElement("input", {
    type: "text",
    placeholder: `Search ${type}...`,
    class: `${type}-search`
  });

  // sort select
  const options = sortOptionsByType[type] || sortOptionsByType.default;
  const sortSelect = createElement("select", { class: `${type}-sort` }, 
    options.map(opt => createElement("option", { value: opt.value }, [opt.label]))
  );

  // category chips
  const chipContainer = createElement("div", { class: "category-chips" });
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const selectedCategory = { value: null };

  categories.forEach(cat => {
    const chip = createElement("button", {
      class: "category-chip buttonx secondary",
      onclick: () => {
        selectedCategory.value = selectedCategory.value === cat ? null : cat;
        renderFiltered();
      }
    }, [cat]);
    chipContainer.appendChild(chip);
  });
  
  // categories.forEach(cat => {
  //   const chip = createElement("button", {
  //     class: "category-chip buttonx secondary",
  //     onclick: () => {
  //       selectedCategory.value = selectedCategory.value === cat ? null : cat;
  //       renderFiltered();
  //     }
  //   }, [cat]);
  //   chipContainer.appendChild(chip);
  // });

  wrapper.append(searchInput, sortSelect);

  function renderFiltered() {
    const filtered = applyFiltersAndSort(items, {
      keyword: searchInput.value,
      category: selectedCategory.value,
      sortBy: sortSelect.value,
      type
    });
    onRender(filtered);
  }

  searchInput.addEventListener("input", renderFiltered);
  sortSelect.addEventListener("change", renderFiltered);

  // initial render
  renderFiltered();

  return { controls: wrapper, renderFiltered, chipContainer };
}

// --- generic filter & sort functions ---
export function filterItems(items, { keyword = "", category = null, extraFilters = [] }) {
  return items.filter(item => {
    const matchesKeyword = keyword
      ? (item.name || item.title || "").toLowerCase().includes(keyword.toLowerCase())
      : true;
    const matchesCategory = category ? item.category === category : true;
    const matchesExtras = extraFilters.every(f => f(item));
    return matchesKeyword && matchesCategory && matchesExtras;
  });
}

export function sortItems(items, sortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === "date" || sortBy === "createdAt") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "title" || sortBy === "name") {
      return (a.title || a.name || "").localeCompare(b.title || b.name || "");
    }
    if (sortBy === "views") return (b.views || 0) - (a.views || 0);
    if (sortBy === "capacity") return (a.capacity || 0) - (b.capacity || 0);
    return 0;
  });
}

// --- domain-specific filtering ---
function filterEvents(events, { keyword, category }) {
  return filterItems(events, {
    keyword,
    category,
    extraFilters: [
      ev => (ev.placename || "").toLowerCase().includes(keyword.toLowerCase())
    ]
  });
}

function sortEvents(events, sortBy) {
  if (sortBy === "price") {
    return [...events].sort((a, b) => {
      const priceA = Math.min(...(a.prices || [0]));
      const priceB = Math.min(...(b.prices || [0]));
      return priceA - priceB;
    });
  }
  return sortItems(events, sortBy);
}

function filterRecipes(recipes, { keyword, category }) {
  return filterItems(recipes, {
    keyword,
    category,
    extraFilters: [
      r => (r.ingredients || []).some(i => String(i.name || "").toLowerCase().includes(keyword.toLowerCase()))
    ]
  });
}


// --- unified entrypoint ---
export function applyFiltersAndSort(items, { keyword = "", category = null, sortBy = null, type = "generic" }) {
  let filtered;

  if (type === "events") filtered = filterEvents(items, { keyword, category });
  else if (type === "recipes") filtered = filterRecipes(items, { keyword, category });
  else filtered = filterItems(items, { keyword, category });

  if (type === "events") return sortEvents(filtered, sortBy);
  return sortItems(filtered, sortBy);
}

// --- pagination ---
export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

// --- optional infinite scroll ---
export function attachInfiniteScroll(target, callback, options = { threshold: 1.0 }) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) callback();
  }, options);
  observer.observe(target);
  return observer;
}
