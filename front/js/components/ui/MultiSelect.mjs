import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

function MultiSelect({ options = [], selected = [], placeholder = "", onChange }) {
  const wrapper = createElement("div", { class: "multiselect-wrapper" });
  const input = createElement("input", { type: "text", placeholder });
  const dropdown = createElement("div", { class: "multiselect-dropdown" });
  const chipsContainer = createElement("div", { class: "multiselect-chips" });

  let open = false;

  // ---------------------------
  // DROPDOWN OPEN / CLOSE
  // ---------------------------
  const openDropdown = () => {
    dropdown.style.display = "block";
    open = true;
    refreshDropdown();
  };

  const closeDropdown = () => {
    dropdown.style.display = "none";
    open = false;
  };

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closeDropdown();
  });

  input.addEventListener("focus", openDropdown);

  // ---------------------------
  // UPDATE DROPDOWN
  // ---------------------------
  const refreshDropdown = () => {
    dropdown.replaceChildren();

    if (!open) return;

    const query = input.value.trim().toLowerCase();

    const filtered = options.filter(opt =>
      opt.toLowerCase().includes(query) && !selected.includes(opt)
    );

    filtered.forEach(opt => {
      const item = createElement("div", { class: "multiselect-item" }, [opt]);

      item.addEventListener("click", () => {
        selected.push(opt);
        onChange(selected);
        refreshChips();
        input.value = "";
        refreshDropdown();
      });

      dropdown.append(item);
    });

    if (filtered.length === 0) {
      const none = createElement("div", { class: "multiselect-item" }, ["No matches"]);
      dropdown.append(none);
    }
  };

  // ---------------------------
  // UPDATE CHIPS
  // ---------------------------
  const refreshChips = () => {
    chipsContainer.replaceChildren();

    selected.forEach((val, i) => {
      const chip = createElement("div", { class: "chip" }, [
        createElement("span", {}, [val]),
        Button("×", "", {
          click: (e) => {
            e.preventDefault();
            selected.splice(i, 1);
            onChange(selected);
            refreshChips();
            refreshDropdown();
          }
        }, "chip-remove-btn")
      ]);

      chipsContainer.append(chip);
    });
  };

  // ---------------------------
  // INPUT HANDLER
  // ---------------------------
  input.addEventListener("input", () => {
    openDropdown();
  });

  // ---------------------------
  // INIT
  // ---------------------------
  refreshChips();
  refreshDropdown();
  wrapper.append(input, dropdown, chipsContainer);

  return wrapper;
}

export default MultiSelect;
