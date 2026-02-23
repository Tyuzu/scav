import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Modal from "../../components/ui/Modal.mjs";
import MultiSelect from "../../components/ui/MultiSelect.mjs";
import { apiFetch } from "../../api/api.js";

// Predefined options
const defaultAccessibilityOptions = [
  "Wheelchair accessible",
  "Ramps available",
  "Elevator",
  "Visual aids",
  "Hearing assistance"
];

const defaultAmenitiesOptions = [
  "WiFi",
  "Parking",
  "Restrooms",
  "Air Conditioning",
  "Projector"
];

// ---------------------------------------
// MAIN EXPORT
// ---------------------------------------
function displayPlaceInfo(container, placeData, isCreator) {
  container.replaceChildren();

  const info = {
    category: placeData.category || "N/A",
    description: placeData.description || "N/A",
    capacity: placeData.capacity || "N/A",
    createdDate: Datex(placeData.created_at) || "N/A",
    updatedDate: Datex(placeData.updated_at) || "N/A",
    accessibility: placeData.accessibility_info
      ? placeData.accessibility_info.split(",").map(s => s.trim())
      : [],
    services: Array.isArray(placeData.amenities) ? [...placeData.amenities] : []
  };

  // RENDER INFO PANEL
  const renderInfo = () => {
    container.replaceChildren();

    if (isCreator) {
      const editBtn = Button(
        "Edit Accessibility & Services",
        "edit-info-btn",
        { click: handleEditInfo },
        "buttonx"
      );
      container.append(editBtn);
    }

    const infoDisplay = createElement("div", { class: "place-info" }, [
      row("Description", info.description),
      row("Category", info.category),
      row("Capacity", info.capacity),
      row("Created On", info.createdDate),
      row("Last Updated", info.updatedDate),
      row("Accessibility", info.accessibility.length ? info.accessibility.join(", ") : "Not specified"),
      row("Services", info.services.length ? info.services.join(", ") : "None")
    ]);

    container.append(infoDisplay);
  };

  // SIMPLE UTIL
  function row(label, val) {
    return createElement("p", {}, [
      createElement("strong", {}, [label + ": "]),
      createElement("span", {}, [val])
    ]);
  }

  // ---------------------------------------
  // HANDLE EDIT (OPEN MODAL)
  // ---------------------------------------
  const handleEditInfo = () => {
    const form = createElement("form", { class: "modal-form" });

    // Accessibility selector
    const accessibilityLabel = createElement("label", {}, ["Accessibility Info"]);

    const accessibilityMulti = MultiSelect({
      options: defaultAccessibilityOptions,
      selected: [...info.accessibility],
      placeholder: "Select accessibility features...",
      wrapperClass: "multiselect-wrapper",
      dropdownClass: "multiselect-dropdown",
      itemClass: "multiselect-item",
      chipsClass: "multiselect-chips",
      chipClass: "chip",
      removeBtnClass: "chip-remove-btn button",
      onChange: sel => { info.accessibility = sel; }
    });

    // Services selector
    const servicesLabel = createElement("label", {}, ["Services / Amenities"]);

    const servicesMulti = MultiSelect({
      options: defaultAmenitiesOptions,
      selected: [...info.services],
      placeholder: "Select services...",
      wrapperClass: "multiselect-wrapper",
      dropdownClass: "multiselect-dropdown",
      itemClass: "multiselect-item",
      chipsClass: "multiselect-chips",
      chipClass: "chip",
      removeBtnClass: "chip-remove-btn button",
      onChange: sel => { info.services = sel; }
    });

    // Buttons
    const saveBtn = Button("Save", "", { type: "submit" }, "buttonx");
    const cancelBtn = Button("Cancel", "", {}, "buttonx");

    form.append(
      accessibilityLabel,
      accessibilityMulti,
      servicesLabel,
      servicesMulti,
      saveBtn,
      cancelBtn
    );

    const { close } = Modal({
      title: "Edit Accessibility & Services",
      content: form,
      size: "medium"
    });

    cancelBtn.addEventListener("click", () => close());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        await apiFetch(`/places/place/${placeData.placeid}/info`, "PUT", {
          accessibility_info: info.accessibility.join(", "),
          amenities: info.services
        });
      } catch (err) {
        console.error("Update failed:", err);
      }

      close();
      renderInfo();
    });
  };

  renderInfo();
}

export { displayPlaceInfo };
