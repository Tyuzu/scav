import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";
import { navigate } from "../../routes/index.js";
import displayPlace from "./displayPlace.js";
import { editPlaceForm, updatePlace, deletePlace } from "./editPlace.js";

/**
 * Client-side validation of the FormData before sending to backend.
 * Throws error via Notify if validation fails.
 * @param {FormData} formData
 */
function validateFormData(formData) {
    const requiredFields = ["name", "address", "description", "category", "capacity"];
    for (const key of requiredFields) {
        const value = formData.get(key)?.trim();
        if (!value) {
            throw new Error(`Field "${key}" is required.`);
        }
    }

    const capacity = Number(formData.get("capacity"));
    if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error("Capacity must be a positive integer.");
    }

    const bannerFile = formData.get("banner");
    if (bannerFile instanceof File) {
        if (bannerFile.size > 5 * 1024 * 1024) {
            throw new Error("Banner file must be smaller than 5MB.");
        }
        if (!bannerFile.type.startsWith("image/")) {
            throw new Error("Banner must be an image file.");
        }
    }

    // Optional: you can also validate zipCode length, phone pattern, etc.
}

/**
 * Creates a place using FormData.
 * @param {FormData} formData 
 */
async function createPlace(formData) {
    try {
        // client-side validation
        validateFormData(formData);

        Notify("Creating place...", { type: "info", dismissible: true, duration: 3000 });
        const result = await apiFetch('/places/place', 'POST', formData);

        Notify(`Place created successfully: ${result.name}`, { type: "success", dismissible: true, duration: 3000 });
        navigate('/place/' + result.placeid);
    } catch (error) {
        Notify(error.message || "Error creating place", { type: "error", dismissible: true, duration: 3000 });
        console.error(error);
        throw error; // re-throw to allow calling function to handle if needed
    }
}


export { createPlace, editPlaceForm, updatePlace, displayPlace, deletePlace, };
