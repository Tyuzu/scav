import { createElement } from "../../../components/createElement.js";

export function renderSearchAndSortUI(type, sort, search, onChange) {
  const sortSelect = createElement(
    "select",
    {
      events: {
        change: (e) => onChange(e.target.value, search),
      },
    },
    [
      { value: "", label: "Sort by" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
      { value: "name_asc", label: "Name: A to Z" },
      { value: "name_desc", label: "Name: Z to A" },
    ].map((opt) =>
      createElement(
        "option",
        { value: opt.value, ...(opt.value === sort ? { selected: true } : {}) },
        [opt.label]
      )
    )
  );
  sortSelect.setAttribute("name","sortproducts");

  const searchInput = createElement("input", {
    type: "text",
    placeholder: `Search ${type}s…`,
    value: search,
    events: {
      input: (e) => onChange(sort, e.target.value),
    },
  });
  searchInput.setAttribute("name","searchproducts");

  return { sortSelect, searchInput };
}
