import { apiFetch } from "../../api/api.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
// --- Add Merchandise ---
async function addMerchandise(
    entityType,
    eventId,
    merchList
) {

    const name = document
        .getElementById("merch-name")
        .value
        .trim();

    const price = parseFloat(
        document.getElementById("merch-price").value
    );

    const stock = parseInt(
        document.getElementById("merch-stock").value,
        10
    );

    const imageFile = document
        .getElementById("merch-image")
        .files?.[0];

    // ---------------------------------
    // VALIDATION
    // ---------------------------------

    if (
        !name ||
        Number.isNaN(price) ||
        Number.isNaN(stock)
    ) {

        Notify(
            "Please fill in all fields correctly.",
            {
                type: "error"
            }
        );

        return;
    }

    if (
        imageFile &&
        !imageFile.type.startsWith("image/")
    ) {

        Notify(
            "Please upload a valid image file.",
            {
                type: "error"
            }
        );

        return;
    }

    try {

        let uploadedImage = null;

        // ---------------------------------
        // IMAGE UPLOAD
        // ---------------------------------

        if (imageFile) {

            Notify(
                "Uploading image...",
                {
                    type: "info",
                    duration: 2000
                }
            );

            uploadedImage = await uploadFile({

                id: uid(),

                file: imageFile,

                entityType,

                entityId: String(eventId)
            });

            if (
                !uploadedImage?.filename &&
                !uploadedImage?.key
            ) {

                throw new Error(
                    "Image upload failed."
                );
            }
        }

        // ---------------------------------
        // PAYLOAD
        // ---------------------------------

        const payload = {

            name,

            price,

            stock,

            merch_pic:
                uploadedImage?.filename
                || uploadedImage?.key
                || ""
        };

        // ---------------------------------
        // API
        // ---------------------------------

        const resp = await apiFetch(
            `/merch/${entityType}/${eventId}`,
            "POST",
            payload
        );

        if (!resp?.data?.merchid) {

            throw new Error(
                resp?.message
                || "Invalid server response."
            );
        }

        // ---------------------------------
        // SUCCESS
        // ---------------------------------

        Notify(
            resp.message
            || "Merchandise added successfully.",
            {
                type: "success",
                duration: 3000
            }
        );

        displayNewMerchandise(
            resp.data,
            merchList
        );

        clearMerchForm();

    } catch (err) {

        console.error(
            "Error adding merchandise:",
            err
        );

        Notify(
            `Error adding merchandise: ${err.message}`,
            {
                type: "error"
            }
        );
    }
}

// --- Clear Form ---
function clearMerchForm() {
    const formContainer = document.getElementById('edittabs');
    if (formContainer) {
        formContainer.replaceChildren();
    }
}

// --- Delete Merchandise ---
async function deleteMerch(entityType, merchId, eventId) {
    if (!confirm('Are you sure you want to delete this merchandise?')) {
        return;
    }
    try {
        const resp = await apiFetch(`/merch/${entityType}/${eventId}/${merchId}`, 'DELETE');
        if (resp.success) {
            Notify('Merchandise deleted successfully!', { type: "success" });
            const merchItem = document.getElementById(`merch-${merchId}`);
            if (merchItem) {
                merchItem.remove();
            }
        } else {
            Notify(`Failed to delete merchandise: ${resp.message}`, { type: "error" });
        }
    } catch (err) {
        console.error('Error deleting merchandise:', err);
        Notify('An error occurred while deleting the merchandise.', { type: "error" });
    }
}

// --- Edit Merchandise ---
async function editMerchForm(entityType, merchId, eventId) {
    try {
        const resp = await apiFetch(`/merch/${entityType}/${eventId}/${merchId}`, 'GET');
        const data = resp?.data;
        if (!data) {
            throw new Error("Merchandise not found.");
        }

        const form = createElement("form", { id: "edit-merch-form" });
        const fields = [
            { label: "Name:", type: "text", id: "merchName", value: data.name, required: true },
            { label: "Price:", type: "number", id: "merchPrice", value: data.price, required: true, step: "0.01" },
            { label: "Stock:", type: "number", id: "merchStock", value: data.stock, required: true }
        ];
        fields.forEach(f => form.appendChild(createFormGroup(f)));

        const submitBtn = Button("Update Merchandise", "", { type: "submit" }, "buttonx");
        form.appendChild(submitBtn);

        const { close: closeModal } = Modal({ title: "Edit Merchandise", content: form });

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const merchData = {
                name: form.querySelector("#merchName").value,
                price: parseFloat(form.querySelector("#merchPrice").value),
                stock: parseInt(form.querySelector("#merchStock").value, 10)
            };
            try {
                const updateResp = await apiFetch(
                    `/merch/${entityType}/${eventId}/${merchId}`,
                    'PUT',
                    merchData
                );
                if (updateResp.success) {
                    Notify('Merchandise updated successfully!', { type: "success" });
                    closeModal();
                } else {
                    Notify(`Failed to update merchandise: ${updateResp.message}`, { type: "error" });
                }
            } catch (err) {
                console.error("Error updating merchandise:", err);
                Notify("An error occurred while updating the merchandise.", { type: "error" });
            }
        });
    } catch (err) {
        console.error("Error fetching merchandise details:", err);
        Notify('An error occurred while fetching the merchandise details.', { type: "error" });
    }
}

// --- Display New Merchandise Item ---
function displayNewMerchandise(merchData, merchList) {
    const item = createElement("div", { class: "merch-item", id: `merch-${merchData.merchid}` });
    item.append(
        createElement("h3", {}, [merchData.name]),
        createElement("p", {}, [`Price: $${merchData.price.toFixed(2)}`]),
        createElement("p", {}, [`Available: ${merchData.stock}`])
    );
    if (merchData.merch_pic) {
        const img = Imagex({
            src: resolveImagePath(EntityType.MERCH, PictureType.THUMB, merchData.merch_pic),
            alt: merchData.name,
            loading: "lazy",
            style: "max-width:160px"
        });
        item.appendChild(img);
    }
    merchList.prepend(item);
}

export {
    addMerchandise,
    clearMerchForm,
    deleteMerch,
    editMerchForm,
    displayNewMerchandise
};
