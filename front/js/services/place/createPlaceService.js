import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { createPlace } from "./placeService.js";
import Notify from "../../components/ui/Notify.mjs";
import { createFormGroup } from "../../components/createFormGroup.js";

const categoryMap = {
    "Food & Beverage": ["Restaurant", "Cafe", "Bakery"],
    "Health & Wellness": ["Hospital", "Clinic", "Gym", "Yoga Center"],
    "Entertainment": ["Theater", "Stadium", "Museum", "Arena"],
    "Services": ["Saloon", "Studio", "Petrol Pump", "Shop"],
    "Public Facilities": ["Toilet", "Park"],
    "Business": ["Business", "Hotel", "Other"]
};

async function createPlaceForm(isLoggedIn, createSection) {
    createSection.replaceChildren();

    if (!isLoggedIn) {
        Notify("You must be logged in to create a place.", { type: "warning", duration: 3000, dismissible: true });
        navigate('/login');
        return;
    }

    const form = createElement("form", { id: "create-place-form", enctype: "multipart/form-data" });

    // Main category
    form.appendChild(createFormGroup({
        label: "Place Type",
        type: "select",
        id: "main-category",
        required: true,
        options: [{ value: "", label: "Select main category" }, ...Object.keys(categoryMap).map(key => ({ value: key, label: key }))]
    }));

    // Sub category
    form.appendChild(createFormGroup({
        label: "Category",
        type: "select",
        id: "category",
        required: true,
        options: [{ value: "", label: "Select sub category" }]
    }));

    // Form fields
    const fields = [
        { label: "Place Name", type: "text", id: "place-name", placeholder: "Place Name", required: true },
        { label: "Description", type: "textarea", id: "place-description", placeholder: "Description", required: true },
        { label: "Address", type: "text", id: "place-address", placeholder: "Address", required: true },
        { label: "City", type: "text", id: "place-city", placeholder: "City", required: true },
        { label: "Country", type: "text", id: "place-country", placeholder: "Country", required: true },
        { label: "Zip Code", type: "text", id: "place-zipcode", placeholder: "Zip Code", required: true },
        { label: "Capacity", type: "number", id: "capacity", placeholder: "Capacity", required: true, additionalProps: { min: 1 } },
        { label: "Phone Number", type: "text", id: "phone", placeholder: "Phone Number" },
    ];
    fields.forEach(field => form.appendChild(createFormGroup(field)));

    // Tags
    const tagWrapper = createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Tags"]),
        createElement("div", { style: "display:flex; gap:8px;" }, [
            createElement("input", { type: "text", id: "tag-input", placeholder: "Add a tag" }),
            createElement("button", { type: "button", id: "add-tag-btn" }, ["Add"])
        ]),
        createElement("div", { id: "tag-list", style: "margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;" }, [])
    ]);
    form.appendChild(tagWrapper);

    let tags = [];
    const tagInput = tagWrapper.querySelector("#tag-input");
    const tagList = tagWrapper.querySelector("#tag-list");

    function renderTags() {
        tagList.replaceChildren();
        tags.forEach((tag, index) => {
            const chip = createElement("span", { style: "padding:4px 8px; background:var(--color-space); border-radius:var(--radius-sm); display:inline-flex; align-items:center; gap:4px;" }, [
                tag,
                createElement("button", { type: "button", style: "border:none; background:none; cursor:pointer; color:red;", onclick: () => { tags.splice(index, 1); renderTags(); } }, ["×"])
            ]);
            tagList.appendChild(chip);
        });
    }

    tagWrapper.querySelector("#add-tag-btn").addEventListener("click", () => {
        const val = tagInput.value.trim();
        if (val && !tags.includes(val)) {
            tags.push(val);
            tagInput.value = "";
            renderTags();
        }
    });

    // Subcategory dynamic
    form.querySelector("#main-category").addEventListener('change', (e) => {
        const sub = form.querySelector("#category");
        sub.innerHTML = '<option value="">Select sub category</option>';
        const selected = categoryMap[e.target.value] || [];
        selected.forEach(subcat => {
            const option = createElement("option", { value: subcat }, [subcat]);
            sub.appendChild(option);
        });
    });

    // Submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();

        // Map frontend IDs to backend keys
        const fieldMap = {
            "place-name": "name",
            "place-address": "address",
            "place-description": "description",
            "place-city": "city",
            "place-country": "country",
            "place-zipcode": "zipCode",
            "capacity": "capacity",
            "phone": "phone",
            "category": "category",
        };

        for (const [id, key] of Object.entries(fieldMap)) {
            const input = form.querySelector(`#${id}`);
            if (!input) continue;
            if (input.type === "file") {
                if (input.files[0]) formData.append(key, input.files[0]);
            } else {
                formData.append(key, input.value.trim());
            }
        }

        // Append tags
        formData.append("tags", JSON.stringify(tags));

        try {
            await createPlace(formData);
        } catch (err) {
            Notify("Failed to create place. Try again.", { duration: 3000, type: "error" });
            console.error("Error creating place:", err);
        }
    });

    const submitButton = createElement("button", { type: "submit", class: "btn btn-primary" }, ["Create Place"]);
    form.appendChild(submitButton);

    createSection.appendChild(createElement('h2', {}, ["Create Place"]));
    createSection.appendChild(form);
}

export { createPlaceForm };
