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
    if (!choice) return false;

    try {
        showLoadingMessage(`Updating ${imageType} picture...`);

        const payload =
            choice === "upload"
                ? await getCroppedImage(imageType)
                : await getImageUrl();

        if (!payload) return false;

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

        const uploadBtn = createButton("Upload Image", () => resolve("upload"));
        const urlBtn = createButton("Use URL", () => resolve("url"));
        const cancelBtn = createButton("Cancel", () => resolve(false));

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
    if (!file) return null;
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
    if (!preview || !imageName) return;

    preview.src =
        resolveImagePath(entityType, pictureType, imageName) +
        `?t=${Date.now()}`;
}

/* ────────── Small Helpers ────────── */
function createButton(label, onClick) {
    const btn = createElement("button", {}, [label]);
    btn.addEventListener("click", onClick, { once: true });
    return btn;
}

// import { createElement } from "../components/createElement";
// import Notify from "../components/ui/Notify.mjs";
// import { openCropper } from "./cropper";
// import { bannerFetch } from "../api/api.js";
// import { resolveImagePath } from "./imagePaths.js";
// import { showLoadingMessage, removeLoadingMessage, capitalize } from "../services/profile/profileHelpers.js";
// import { handleError } from "./utils.js";

// // updateImageWithCrop
// export async function updateImageWithCrop({
//   entityType,
//   imageType,
//   stateKey,
//   stateEntityKey,
//   previewElementId,
//   pictureType,
//   entityId
// }) {
//   const modal = createElement("div", { style: "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;" });
//   const box = createElement("div", { style: "background:#fff;padding:20px;border-radius:8px;text-align:center;min-width:300px;" }, [
//     createElement("p", {}, [`Choose how to update your ${imageType} picture:`])
//   ]);
//   const uploadBtn = createElement("button", { style: "margin:5px;" }, ["Upload Image"]);
//   const linkBtn = createElement("button", { style: "margin:5px;" }, ["Use URL"]);
//   const cancelBtn = createElement("button", { style: "margin:5px;" }, ["Cancel"]);

//   box.append(uploadBtn, linkBtn, cancelBtn);
//   modal.appendChild(box);
//   document.body.appendChild(modal);

//   return new Promise((resolve) => {
//     const cleanup = () => document.body.removeChild(modal);

//     uploadBtn.addEventListener("click", async () => {
//       cleanup();
//       const fileInput = createElement("input", { type: "file", accept: "image/*", style: "display:none;" });
//       document.body.appendChild(fileInput);
//       fileInput.click();

//       fileInput.addEventListener("change", async () => {
//         if (!fileInput.files?.[0]) {
//           document.body.removeChild(fileInput);
//           return resolve(false);
//         }

//         const croppedBlob = await openCropper({ file: fileInput.files[0], type: imageType });
//         document.body.removeChild(fileInput);
//         if (!croppedBlob) return resolve(false);

//         showLoadingMessage(`Updating ${imageType} picture...`);
//         try {
//           const formData = new FormData();
//           formData.append(stateKey, croppedBlob, `${imageType}.jpg`);

//           const endpoint = `/picture/${entityType.toLowerCase()}/${entityId}`;
//           const response = await bannerFetch(endpoint, "PUT", formData);

//           if (!response) throw new Error(`No response for ${imageType} picture update.`);

//           // const newImageName = response[stateKey];
//           const newImageName = response.data[stateKey];
//           if (!newImageName) throw new Error("No image name returned from server.");

//           Notify(`${capitalize(imageType)} picture updated successfully.`, { type: "success", duration: 3000 });
//           const preview = document.getElementById(previewElementId);
//           if (preview) preview.src = resolveImagePath(entityType, pictureType, newImageName) + `?t=${Date.now()}`;

//           resolve(response); // return API response, not just true
//         } catch (err) {
//           console.error(err);
//           handleError(`Error updating ${imageType} picture. Please try again.`);
//           resolve(false);
//         } finally {
//           removeLoadingMessage();
//         }
//       }, { once: true });
//     }, { once: true });

//     linkBtn.addEventListener("click", async () => {
//       cleanup();
//       const url = window.prompt("Enter the image URL:");
//       if (!url) return resolve(false);

//       showLoadingMessage(`Updating ${imageType} picture from URL...`);
//       try {
//         const response = await bannerFetch(
//           `/picture/${entityType.toLowerCase()}/${entityId}`,
//           "PUT",
//           { [stateKey]: url }
//         );
        
//         if (!response) throw new Error("No response from server.");

//         Notify(`${capitalize(imageType)} picture updated successfully.`, { type: "success", duration: 3000 });
//         const preview = document.getElementById(previewElementId);
//         if (preview) preview.src = url + `?t=${Date.now()}`;

//         resolve(response); // return API response
//       } catch (err) {
//         console.error(err);
//         handleError(`Error updating ${imageType} picture. Please try again.`);
//         resolve(false);
//       } finally {
//         removeLoadingMessage();
//       }
//     }, { once: true });

//     cancelBtn.addEventListener("click", () => {
//       cleanup();
//       resolve(false);
//     }, { once: true });
//   });
// }