import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { createFormGroup } from "../../../components/createFormGroup.js";
import Button from "../../../components/base/Button.js";

export function renderItemForm(container, mode, itemData, type, onDone) {
  container.replaceChildren();

  const form = createElement("form", { class: "create-section" });

  // ---------------------------------
  // CATEGORY OPTIONS
  // ---------------------------------

  const getCategoryOptions = (type) => {
    if (type === "product") {
      return [
        { value: "", label: "Select category" },
        { value: "Spices", label: "Spices" },
        { value: "Pickles", label: "Pickles" },
        { value: "Flour", label: "Flour" },
        { value: "Oils", label: "Oils" },
        { value: "Honey", label: "Honey" },
        { value: "Tea & Coffee", label: "Tea & Coffee" },
        { value: "Dry Fruits", label: "Dry Fruits" },
        { value: "Natural Sweeteners", label: "Natural Sweeteners" }
      ];
    }

    if (type === "tool") {
      return [
        { value: "", label: "Select category" },
        { value: "Cutting", label: "Cutting" },
        { value: "Irrigation", label: "Irrigation" },
        { value: "Harvesting", label: "Harvesting" },
        { value: "Hand Tools", label: "Hand Tools" },
        { value: "Protective Gear", label: "Protective Gear" },
        { value: "Fertilizer Applicators", label: "Fertilizer Applicators" }
      ];
    }

    return [];
  };

  // ---------------------------------
  // FORM GROUPS
  // ---------------------------------

  const nameGroup = createFormGroup({
    type: "text",
    id: "name",
    label: "Name",
    value: itemData?.name || "",
    placeholder: "Enter item name",
    required: true
  });

  const categoryGroup = createFormGroup({
    type: getCategoryOptions(type).length ? "select" : "text",
                                        id: "category",
                                        label: "Category",
                                        value: itemData?.category || "",
                                        placeholder: getCategoryOptions(type).length ? "" : "e.g., Fruit, Tool",
                                        required: true,
                                        options: getCategoryOptions(type)
  });

  const priceGroup = createFormGroup({
    type: "number",
    id: "price",
    label: "Price (₹)",
                                     value: itemData?.price ?? "",
                                     placeholder: "e.g., 49.99",
                                     required: true,
                                     additionalProps: {
                                       step: "0.01",
                                       min: "0"
                                     }
  });

  const quantityGroup = createFormGroup({
    type: "number",
    id: "quantity",
    label: "Quantity",
    value: itemData?.quantity ?? "",
    placeholder: "e.g., 100",
    required: true,
    additionalProps: {
      min: "0"
    }
  });

  const unitGroup = createFormGroup({
    type: "select",
    id: "unit",
    label: "Unit",
    value: itemData?.unit || "",
    required: true,
    options: [
      { value: "", label: "Select unit" },
      { value: "kg", label: "kg" },
      { value: "litre", label: "litre" },
      { value: "units", label: "units" }
    ]
  });

  const skuGroup = createFormGroup({
    type: "text",
    id: "sku",
    label: "SKU / Code",
    value: itemData?.sku || "",
    placeholder: "Optional code"
  });

  const availableFromGroup = createFormGroup({
    type: "date",
    id: "availableFrom",
    label: "Available From",
    value: itemData?.availableFrom?.slice(0, 10) || ""
  });

  const availableToGroup = createFormGroup({
    type: "date",
    id: "availableTo",
    label: "Available To",
    value: itemData?.availableTo?.slice(0, 10) || ""
  });

  const descriptionGroup = createFormGroup({
    type: "textarea",
    id: "description",
    label: "Description",
    value: itemData?.description || "",
    placeholder: "Detailed info",
    required: true
  });

  const featuredGroup = createFormGroup({
    type: "checkbox",
    id: "featured",
    label: "Featured?",
    additionalProps: {
      checked: itemData?.featured || false
    }
  });

  form.append(
    categoryGroup,
    nameGroup,
    priceGroup,
    quantityGroup,
    unitGroup,
    skuGroup,
    availableFromGroup,
    availableToGroup,
    descriptionGroup,
    featuredGroup
  );

  // ---------------------------------
  // BUTTONS
  // ---------------------------------

  const submitBtn = Button(
    mode === "create" ? `Create ${type}` : `Update ${type}`,
    `submit-${type}-btn`,
    {},
    "primary-button"
  );

  const cancelBtn = Button(
    "Cancel",
    `cancel-${type}-btn`,
    {
      click: () => onDone()
    },
    "secondary-button"
  );

  const actions = createElement(
    "div",
    {
      class: "form-actions"
    },
    [submitBtn, cancelBtn]
  );

  form.appendChild(actions);

  // ---------------------------------
  // DELETE BUTTON
  // ---------------------------------

  if (mode === "edit" && itemData?.productid) {
    const deleteBtn = Button(
      `Delete ${type}`,
      `delete-${type}-btn`,
      {
        click: async () => {
          if (!confirm(`Delete this ${type}?`)) {
            return;
          }

          try {
            await apiFetch(`/farm/${type}/${itemData.productid}`, "DELETE");
            onDone();
          } catch (err) {
            if (err.status === 403) {
              alert("You can only delete items you created");
            } else {
              alert("Delete failed");
            }
            console.error(err);
          }
        }
      },
      "danger-button"
    );

    form.appendChild(deleteBtn);
  }

  // ---------------------------------
  // SUBMIT
  // ---------------------------------

  form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    try {
      const payload = {
        name: form.name.value.trim(),
        category: form.category.value.trim(),
        price: parseFloat(form.price.value),
        quantity: parseInt(form.quantity.value, 10),
        unit: form.unit.value,
        sku: form.sku.value.trim(),
        availableFrom: form.availableFrom.value,
        availableTo: form.availableTo.value,
        description: form.description.value.trim(),
        featured: form.featured.checked
      };

      const url =
      mode === "create"
      ? `/farm/${type}`
      : `/farm/${type}/${itemData.productid}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await apiFetch(url, method, payload);
      
      if (!res || !res.productid || !res.status) {
        throw new Error("Request failed");
      } 
      onDone();
    } catch (err) {
      if (err.status === 403) {
        alert("You can only edit items you created");
      } else {
        alert(`${mode === "create" ? "Create" : "Update"} failed`);
      }

      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  };

  container.appendChild(form);
}
