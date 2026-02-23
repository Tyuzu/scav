import { createElement } from "../../../components/createElement.js";
import { createFormGroup } from "../../../components/createFormGroup.js";
import { cropCategoryMap } from "./cropCategories.js";

export function createCommonCropForm({ crop = {}, currentFarmName = "", isEdit = false, onSubmit }) {
    const form = createElement("form", { class: isEdit ? "crop-edit-form create-section" : "crop-create-form create-section" });

    const h20 = createElement("h2", {}, [isEdit ? "Edit Crop" : "Create Crop"]);
    form.appendChild(h20);

    let preCategory = "";
    if (crop.name) {
        for (const [cat, crops] of Object.entries(cropCategoryMap)) {
            if (crops.includes(crop.name)) {
                preCategory = cat;
                break;
            }
        }
    }

    const categoryGroup = createFormGroup({
        label: "Category",
        type: "select",
        id: "crop-category",
        name: "category",
        required: true,
        placeholder: "Select Category",
        options: Object.keys(cropCategoryMap).map(c => ({ value: c, label: c })),
        value: preCategory
    });

    const cropGroup = createFormGroup({
        label: "Crop",
        type: "select",
        id: "crop-name",
        name: "name",
        required: true,
        placeholder: "Select Crop",
        options: [],
        value: crop.name || ""
    });

    const priceGroup = createFormGroup({
        label: "Price",
        type: "number",
        id: "crop-price",
        name: "price",
        placeholder: "price",
        value: crop.price || "",
        required: true,
        additionalProps: { step: "0.01" }
    });

    const quantityGroup = createFormGroup({
        label: "Quantity",
        type: "number",
        id: "crop-quantity",
        name: "quantity",
        placeholder: "quantity",
        value: crop.quantity || "",
        required: true
    });

    const unitGroup = createFormGroup({
        label: "Unit",
        type: "select",
        id: "crop-unit",
        name: "unit",
        required: true,
        options: ["kg", "liters", "dozen", "units"].map(u => ({ value: u, label: u })),
        value: crop.unit || ""
    });

    const notesGroup = createFormGroup({
        label: "Notes",
        type: "textarea",
        id: "crop-notes",
        placeholder: "Notes",
        name: "notes",
        value: crop.notes || ""
    });

    const harvestGroup = createFormGroup({
        label: "Harvest Date",
        type: "date",
        id: "crop-harvest",
        name: "harvestDate",
        value: crop.harvestDate?.split("T")[0] || ""
    });

    const expiryGroup = createFormGroup({
        label: "Expiry Date",
        type: "date",
        id: "crop-expiry",
        name: "expiryDate",
        value: crop.expiryDate?.split("T")[0] || ""
    });

    const featuredGroup = createFormGroup({
        label: "Featured",
        type: "checkbox",
        id: "crop-featured",
        name: "featured",
        value: crop.featured || false
    });

    const outOfStockGroup = createFormGroup({
        label: "Out of Stock",
        type: "checkbox",
        id: "crop-outofstock",
        name: "outOfStock",
        value: crop.outOfStock || false
    });

    // const imageGroup = createFormGroup({
    //     label: "Image",
    //     type: "file",
    //     id: "crop-image",
    //     name: "image",
    //     accept: "image/*"
    // });

    const fields = [
        categoryGroup, cropGroup, priceGroup, quantityGroup, unitGroup,
        notesGroup, harvestGroup, expiryGroup, featuredGroup, outOfStockGroup, 
        //imageGroup
    ];

    if (!isEdit && currentFarmName) {
        const farmInput = createElement("input", { type: "hidden", name: "farmName", value: currentFarmName });
        fields.push(farmInput);
    }

    fields.forEach(f => form.appendChild(f));

    // Submit button
    const submitBtn = createElement("button", { type: "submit" }, [isEdit ? "Save Changes" : "Add Crop"]);
    form.appendChild(submitBtn);

    // Dynamic crop population
    const categorySelect = categoryGroup.querySelector("select");
    const cropSelect = cropGroup.querySelector("select");

    function populateCrops(category) {
        cropSelect.innerHTML = '<option value="">Select Crop</option>';
        const crops = cropCategoryMap[category];
        if (!crops) return cropSelect.disabled = true;
        crops.forEach(c => {
            const option = createElement("option", { value: c, selected: c === crop.name }, [c]);
            cropSelect.appendChild(option);
        });
        cropSelect.disabled = false;
    }

    populateCrops(preCategory);
    categorySelect.addEventListener("change", e => populateCrops(e.target.value));

    form.addEventListener("submit", e => {
        e.preventDefault();
        if (harvestGroup.querySelector("input").value && expiryGroup.querySelector("input").value) {
            const h = new Date(harvestGroup.querySelector("input").value);
            const x = new Date(expiryGroup.querySelector("input").value);
            if (h > x) {
                form.parentElement.textContent = "❌ Expiry date must be after harvest date.";
                return;
            }
        }

        const formData = new FormData(form);
        onSubmit(formData, submitBtn);
    });

    return form;
}
