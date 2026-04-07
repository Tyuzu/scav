import Modal from "../components/ui/Modal.mjs";
import { createElement } from "../components/createElement.js";
import Notify from "../components/ui/Notify.mjs";
import { openCropper } from "./cropper";
import { bannerFetch } from "../api/api.js";
import { resolveImagePath } from "./imagePaths.js";
import {
    showLoadingMessage,
    removeLoadingMessage,
    capitalize
} from "../services/profile/profileHelpers.js";
import { handleError } from "./utils.js";
import Button from "../components/base/Button.js";

/* ────────── Public API ────────── */
export async function updateImageWithCrop({
    entityType,
    imageType,
    stateKey,
    previewElementId,
    pictureType,
    entityId
}) {
    const choice = await askUpdateMethod(imageType);
    if (!choice) {
return false;
}

    try {
        showLoadingMessage(`Updating ${imageType} picture...`);

        const payload =
            choice === "upload"
                ? await getCroppedImage(imageType)
                : await getImageUrl();

        if (!payload) {
return false;
}

        const response = await uploadImage({
            entityType,
            entityId,
            stateKey,
            payload
        });

        updatePreview(
            previewElementId,
            entityType,
            pictureType,
            response.data[stateKey]
        );

        Notify(
            `${capitalize(imageType)} picture updated successfully.`,
            { type: "success", duration: 3000 }
        );

        return response;
    } catch (err) {
        console.error(err);
        handleError(`Error updating ${imageType} picture.`);
        return false;
    } finally {
        removeLoadingMessage();
    }
}

/* ────────── UI Choice ────────── */
function askUpdateMethod(imageType) {
    return new Promise(resolve => {
        const content = createElement("div", { class: "vflex gap10" }, [
            createElement("p", {}, [`Update ${imageType} picture:`])
        ]);

        const uploadBtn = Button("Upload Image", "up-banner-btn", { click: () => resolve("upload"), }, "btn")
        const urlBtn = Button("Use URLAdd Media", "url-banner-btn", { click: () => resolve("url"), }, "btn")
        const cancelBtn = Button("Cancel", "cancel-banner-btn", { click: () => resolve(false), }, "btn")

        // const uploadBtn = createButton("Upload Image", () => resolve("upload"));
        // const urlBtn = createButton("Use URL", () => resolve("url"));
        // const cancelBtn = createButton("Cancel", () => resolve(false));

        content.append(uploadBtn, urlBtn, cancelBtn);

        const { close } = Modal({
            title: "Update Picture",
            content
        });

        [uploadBtn, urlBtn, cancelBtn].forEach(btn =>
            btn.addEventListener("click", close, { once: true })
        );
    });
}

/* ────────── Image Sources ────────── */
async function getCroppedImage(imageType) {
    const file = await pickFile();
    if (!file) {
return null;
}
    return await openCropper({ file, type: imageType });
}

function getImageUrl() {
    const url = window.prompt("Enter image URL:");
    return url || null;
}

function pickFile() {
    return new Promise(resolve => {
        const input = createElement("input", {
            type: "file",
            accept: "image/*",
            style: "display:none"
        });

        document.body.append(input);
        input.click();

        input.addEventListener(
            "change",
            () => {
                const file = input.files?.[0] || null;
                input.remove();
                resolve(file);
            },
            { once: true }
        );
    });
}

/* ────────── Upload ────────── */
async function uploadImage({ entityType, entityId, stateKey, payload }) {
    const endpoint = `/api/v1/banner/${entityType.toLowerCase()}/${entityId}`;

    if (payload instanceof Blob) {
        const formData = new FormData();
        formData.append(stateKey, payload, "image.jpg");
        return bannerFetch(endpoint, "PUT", formData);
    }

    return bannerFetch(endpoint, "PUT", { [stateKey]: payload });
}

/* ────────── Preview Update ────────── */
function updatePreview(previewElementId, entityType, pictureType, imageName) {
    const preview = document.getElementById(previewElementId);
    if (!preview || !imageName) {
return;
}

    preview.src =
        resolveImagePath(entityType, pictureType, imageName) +
        `?t=${Date.now()}`;
}
