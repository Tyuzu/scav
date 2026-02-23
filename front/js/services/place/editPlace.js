import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import displayPlace from "./displayPlace.js";
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
  
async function editPlaceForm(isLoggedIn, placeId, content) {
    if (!isLoggedIn) {
        navigate('/login');
        return;
    }

    try {
        const place = await apiFetch(`/places/place/${placeId}`);
        content.innerHTML = '';

        const form = createElement('form', { id: 'edit-place-form' });

        // Detect main category
        let detectedMainCategory = Object.entries(categoryMap).find(([_, subs]) =>
            subs.includes(place.category)
        )?.[0] || "";

        // Main category
        form.appendChild(createFormGroup({
            label: "Place Type",
            type: "select",
            id: "main-category",
            value: detectedMainCategory,
            required: true,
            options: Object.keys(categoryMap).map(cat => ({ value: cat, label: cat }))
        }));

        // Subcategory
        form.appendChild(createFormGroup({
            label: "Category",
            type: "select",
            id: "category",
            value: place.category,
            required: true,
            options: (categoryMap[detectedMainCategory] || []).map(sub => ({ value: sub, label: sub }))
        }));

        // Other fields
        const fields = [
            { label: 'Place Name', type: 'text', id: 'place-name', value: place.name, placeholder: 'Place Name', required: true },
            { label: 'Description', type: 'textarea', id: 'place-description', value: place.description, placeholder: 'Description', required: true },
            { label: 'Address', type: 'text', id: 'place-address', value: place.address, placeholder: 'Address', required: true },
            { label: 'Capacity', type: 'number', id: 'capacity', value: place.capacity, placeholder: 'Capacity', required: true },
            // { label: 'Place Banner', type: 'file', id: 'place-banner', additionalProps: { accept: 'image/*' } },
        ];
        fields.forEach(field => form.appendChild(createFormGroup(field)));

        // TAGS FIELD
        const tagWrapper = createElement("div", { class: "form-group" }, [
            createElement("label", {}, ["Tags"]),
            createElement("div", { style: "display:flex;gap:8px;" }, [
                createElement("input", { type: "text", id: "tag-input", placeholder: "Add a tag" }),
                createElement("button", { type: "button", id: "add-tag-btn" }, ["Add"])
            ]),
            createElement("div", { id: "tag-list", style: "margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;" }, [])
        ]);
        form.appendChild(tagWrapper);

        let tags = Array.isArray(place.tags) ? [...place.tags] : [];
        const tagInput = tagWrapper.querySelector("#tag-input");
        const tagList = tagWrapper.querySelector("#tag-list");

        function renderTags() {
            tagList.replaceChildren();
            tags.forEach((tag, index) => {
                const chip = createElement("span", {
                    style: "padding:4px 8px;background:var(--color-space);border-radius:var(--radius-sm);display:inline-flex;align-items:center;gap:4px;"
                }, [
                    tag,
                    createElement("button", {
                        type: "button",
                        style: "border:none;background:none;cursor:pointer;color:red;",
                        onclick: () => { tags.splice(index, 1); renderTags(); }
                    }, ["×"])
                ]);
                tagList.appendChild(chip);
            });
        }
        renderTags();

        tagWrapper.querySelector("#add-tag-btn").addEventListener("click", () => {
            const val = tagInput.value.trim();
            if (val && !tags.includes(val)) {
                tags.push(val);
                tagInput.value = "";
                renderTags();
            }
        });

        // Subcategory update
        form.querySelector('#main-category').addEventListener('change', (e) => {
            const selected = e.target.value;
            const subSelect = form.querySelector('#category');
            subSelect.innerHTML = '';
            (categoryMap[selected] || []).forEach(sub => {
                const opt = createElement("option", { value: sub }, [sub]);
                subSelect.appendChild(opt);
            });
        });

        // Submit button
        const updateButton = createElement('button', { type: 'submit', class: "btn btn-primary" }, ["Update Place"]);
        form.appendChild(updateButton);

        content.appendChild(createElement("h2", {}, ["Edit Place"]));
        content.appendChild(form);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await updatePlace(isLoggedIn, placeId, tags);
        });

    } catch (error) {
        Notify(`Error loading place: ${error.message}`, { type: "warning", duration: 3000, dismissible: true });
    }
}

async function updatePlace(isLoggedIn, placeId, tags = []) {
    if (!isLoggedIn) {
        Notify("Please log in to update place.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    const name = document.getElementById("place-name").value.trim();
    const capacity = document.getElementById("capacity").value;
    const category = document.getElementById("category").value;
    const address = document.getElementById("place-address").value.trim();
    const description = document.getElementById("place-description").value.trim();

    if (!name || !capacity || !category || !address || !description) {
        Notify("Please fill in all required fields.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('capacity', capacity);
    formData.append('category', category);
    formData.append('address', address);
    formData.append('description', description);
    formData.append('tags', JSON.stringify(tags));

    try {
        const result = await apiFetch(`/places/place/${placeId}`, 'PUT', formData);
        Notify(`Place updated successfully: ${result.name}`, { type: "success", duration: 3000, dismissible: true });
        displayPlace(isLoggedIn, placeId);
    } catch (error) {
        Notify(`Error updating place: ${error.message}`, { type: "error", duration: 3000, dismissible: true });
    }
}

async function deletePlace(isLoggedIn, placeId) {
    if (!isLoggedIn) {
        Notify("Please log in to delete your place.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }
    if (confirm("Are you sure you want to delete this place?")) {
        try {
            await apiFetch(`/places/place/${placeId}`, 'DELETE');
            Notify("Place deleted successfully.", { type: "success", duration: 3000, dismissible: true });
            navigate('/places');
        } catch (error) {
            Notify(`Error deleting place: ${error.message || 'Unknown error'}`, { type: "error", duration: 3000, dismissible: true });
        }
    }
}

export { editPlaceForm, updatePlace, deletePlace };

