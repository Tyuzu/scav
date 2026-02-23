import Button from "../../../components/base/Button";
import { createElement } from "../../../components/createElement";
import { apiFetch } from "../../../api/api.js";

export async function renderCategoryChips(container, selectedCategory, onSelect, type = "product") {
  container.replaceChildren();

  let categories = [];

  try {
    const query = new URLSearchParams({ type }).toString();
    const fetched = await apiFetch(`/farm/items/categories?${query}`);
    categories = Array.isArray(fetched) ? fetched.filter(Boolean) : [];
  } catch (_) {
    categories = [];
  }

  const chipContainer = createElement("div", { class: "chip-container" });

  const allChip = Button(
    "All",
    "chip-all",
    { click: () => onSelect("") },
    selectedCategory ? "chip" : "chip selected"
  );

  const chips = [allChip];

  for (const cat of categories) {
    const chip = Button(
      cat,
      `chip-${cat}`,
      { click: () => onSelect(cat) },
      selectedCategory === cat ? "chip selected" : "chip"
    );
    chips.push(chip);
  }

  chipContainer.append(...chips);
  container.append(chipContainer);
}
