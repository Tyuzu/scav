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
                : await getImageFromUrl(); // now returns REMOTE object

        if (!payload) {
            return false;
        }

        const response = await uploadImage({
            entityType,
            entityId,
            stateKey,
            payload
        });

        // 🔴 FIX: handle API response correctly
        const attachments = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : [];

        const attachment = attachments.find(a => a.key === stateKey);

        if (!attachment) {
            throw new Error("Upload succeeded but no matching file returned");
        }

        updatePreview(
            previewElementId,
            entityType,
            pictureType,
            attachment.filename
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

        const uploadBtn = Button("Upload Image", "up-banner-btn", {
            click: () => resolve("upload")
        }, "btn");

        const urlBtn = Button("Use URL", "url-banner-btn", {
            click: () => resolve("url")
        }, "btn");

        const cancelBtn = Button("Cancel", "cancel-banner-btn", {
            click: () => resolve(false)
        }, "btn");

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

/**
 * ✅ NEW: Return remote descriptor instead of Blob
 */
async function getImageFromUrl() {
    const url = window.prompt("Enter image URL:");
    if (!url) {
        return null;
    }
    
    try {
        // basic validation only
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Invalid protocol");
        }

        return {
            type: "remote",
            url
        };

    } catch {
        handleError("Invalid image URL");
        return null;
    }
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

        input.addEventListener("change", () => {
            const file = input.files?.[0] || null;
            input.remove();
            resolve(file);
        }, { once: true });
    });
}

/* ────────── Upload ────────── */
export async function uploadImage({ entityType, entityId, stateKey, payload }) {
    const endpoint = `/api/v1/filedrop`;

    const formData = new FormData();

    formData.append("entityType", entityType);
    formData.append("entityId", entityId);

    if (payload instanceof Blob) {
        formData.append(stateKey, payload, "upload.jpg");

    } else if (payload?.type === "remote") {
        formData.append("remoteUrl", payload.url);
        formData.append("remoteKey", stateKey);
    }

    return bannerFetch(endpoint, "POST", formData);
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