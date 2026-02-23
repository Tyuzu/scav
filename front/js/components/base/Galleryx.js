import { createElement } from "../createElement.js";
import { resolveImagePath, PictureType } from "../../utils/imagePaths.js";
import Notify from "../ui/Notify.mjs";

/**
 * Generic image gallery editor.
 * Handles displaying, removing, and uploading images.
 *
 * @param {Object} options
 * @param {boolean} [options.isCreator=false] - Enables editing/removal/upload
 * @param {Array<string>} [options.existingImages=[]] - List of current images (filenames or URLs)
 * @param {string} [options.galleryEntityType=""] - For resolveImagePath()
 * @param {string} [options.acceptTypes="image/*"] - Allowed file types
 * @param {HTMLElement|null} [options.contentContainer=null] - Optional target element
 * @param {function(FormData):Promise<any>} [options.onSubmit=null] - Async callback for handling submission (receives FormData)
 * @param {function(any):void} [options.onSuccess=null] - Called after successful submission
 */
const Galleryx = ({
  isCreator = false,
  existingImages = [],
  galleryEntityType = "",
  acceptTypes = "image/*",
  contentContainer = null,
  onSubmit = null,
  onSuccess = null,
} = {}) => {

  // Container
  const container = contentContainer || document.querySelector("#content");
  container.replaceChildren();

  const section = createElement("div", { class: "edit-images-section" });
  const title = createElement("h2", {}, ["Edit Images"]);
  section.appendChild(title);

  const form = createElement("form", { enctype: "multipart/form-data" });
  section.appendChild(form);

  // --- Existing images preview ---
  const existingDiv = createElement("div", { class: "existing-images" });
  const keptImages = new Set(existingImages || []);

  const renderExisting = () => {
    existingDiv.replaceChildren();

    keptImages.forEach(img => {
      const wrapper = createElement("div", {
        class: "img-wrapper",
        style: "display:inline-block;position:relative;margin:5px;"
      });

      const imgEl = createElement("img", {
        src: resolveImagePath(galleryEntityType, PictureType.PHOTO, img),
        style: "max-width:120px;border:1px solid #ccc;border-radius:4px;"
      });

      if (isCreator) {
        const removeBtn = createElement("button", {
          type: "button",
          style: "position:absolute;top:0;right:0;background:red;color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;"
        }, ["×"]);

        removeBtn.addEventListener("click", () => {
          keptImages.delete(img);
          renderExisting();
        });

        wrapper.append(imgEl, removeBtn);
      } else {
        wrapper.append(imgEl);
      }

      existingDiv.appendChild(wrapper);
    });
  };

  renderExisting();
  form.appendChild(existingDiv);

  // --- Upload new images ---
  let uploadInput = null;
  if (isCreator) {
    uploadInput = createElement("input", {
      type: "file",
      id: "gallery-images",
      accept: acceptTypes,
      multiple: true,
    });
    form.appendChild(uploadInput);
  }

  // --- Submit button ---
  if (isCreator && typeof onSubmit === "function") {
    const submitBtn = createElement("button", { type: "submit", class: "btn btn-primary" }, ["Update Images"]);
    form.appendChild(submitBtn);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      submitBtn.disabled = true;

      const payload = new FormData();
      Array.from(keptImages).forEach(img => payload.append("keepImages", img));
      if (uploadInput && uploadInput.files.length > 0) {
        Array.from(uploadInput.files).forEach(file => payload.append("images", file));
      }

      try {
        Notify("Updating images...", { type: "info", duration: 1500, dismissible: true });
        const result = await onSubmit(payload); // Your fetch or API handler
        Notify("Images updated successfully!", { type: "success", duration: 3000, dismissible: true });
        if (typeof onSuccess === "function") onSuccess(result);
      } catch (err) {
        Notify(`Error: ${err.message || "Failed to update images."}`, { type: "error", duration: 4000, dismissible: true });
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  container.appendChild(section);
  return container;
};

export default Galleryx;
export { Galleryx };
