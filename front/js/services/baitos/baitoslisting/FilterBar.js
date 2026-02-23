import { categoryMap } from "./utils.js";
import Button from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";

/**
 * buildFilterBar(onFilterChange, onClear)
 * - onFilterChange: called when any filter input changes
 * - onClear: optional callback called specifically when user clicks the clear button
 */
export function buildFilterBar(onFilterChange, onClear = null) {
  const categorySelect = createElement("select", {});
  const subcategorySelect = createElement("select", {});
  const locationInput = createElement("input", { type: "text", placeholder: "📍 Location (comma separated)" });
  const keywordInput = createElement("input", { type: "text", placeholder: "🔍 Keywords" });
  const wageInput = createElement("input", { type: "number", placeholder: "Min Wage (¥)", min: 0 });
  const sortSelect = createElement("select", {});

  // populate category options
  categorySelect.append(
    createElement("option", { value: "" }, ["All Categories"]),
    ...Object.keys(categoryMap).map(cat => createElement("option", { value: cat }, [cat]))
  );

  subcategorySelect.append(createElement("option", { value: "" }, ["All Roles"]));

  sortSelect.append(
    createElement("option", { value: "date" }, ["Sort: Newest"]),
    createElement("option", { value: "wage" }, ["Sort: Wage (high → low)"])
  );

  categorySelect.addEventListener("change", () => {
    while (subcategorySelect.firstChild) subcategorySelect.removeChild(subcategorySelect.firstChild);
    subcategorySelect.append(
      createElement("option", { value: "" }, ["All Roles"]),
      ...(categoryMap[categorySelect.value] || []).map(sub => createElement("option", { value: sub }, [sub]))
    );
    if (typeof onFilterChange === "function") onFilterChange();
  });

  // listen to inputs
  [keywordInput, subcategorySelect, locationInput, wageInput, sortSelect].forEach(el =>
    el.addEventListener("input", () => {
      if (typeof onFilterChange === "function") onFilterChange();
    })
  );

  const clearBtn = Button("Clear Filters", "clear-filters", {
    click: () => {
      categorySelect.value = "";
      while (subcategorySelect.firstChild) subcategorySelect.removeChild(subcategorySelect.firstChild);
      subcategorySelect.append(createElement("option", { value: "" }, ["All Roles"]));
      locationInput.value = "";
      keywordInput.value = "";
      wageInput.value = "";
      sortSelect.value = "date";

      // call page-level clear handler if provided (this is where currentPage reset should happen)
      if (typeof onClear === "function") onClear();

      // also trigger standard filter change so UI updates
      if (typeof onFilterChange === "function") onFilterChange();
    }
  }, "btn btn-secondary");

  const filterBar = createElement("div", { class: "baito-filter-bar" }, [
    categorySelect, subcategorySelect, locationInput, keywordInput, wageInput, sortSelect, clearBtn
  ]);

  return {
    filterBar,
    getValues: () => ({
      category: categorySelect.value,
      subcategory: subcategorySelect.value,
      locations: locationInput.value.toLowerCase().split(",").map(s => s.trim()).filter(Boolean),
      keyword: keywordInput.value.toLowerCase(),
      minWage: parseInt(wageInput.value || "0", 10),
      sort: sortSelect.value
    }),
    resetPage: () => {
      // convenience: reuse onFilterChange to re-evaluate lists
      if (typeof onFilterChange === "function") onFilterChange();
    },
    clearFilters: () => {
      // allow caller (page) to clear filters programmatically
      clearBtn.click();
    }
  };
}
