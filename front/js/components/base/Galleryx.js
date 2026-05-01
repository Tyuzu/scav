import { createElement } from "../createElement.js";
import { resolveImagePath, PictureType } from "../../utils/imagePaths.js";
import Notify from "../ui/Notify.mjs";
const Galleryx = ({
  isCreator = false,
  existingImages = [],
  galleryEntityType = "",
  acceptTypes = "image/*",
  onSubmit = null,
  onSuccess = null,
} = {}) => {

  // Root container (SELF-CONTAINED)
  const container = createElement("div", { class: "edit-images-section" });

  const title = createElement("h2", {}, ["Edit Images"]);
  container.appendChild(title);

  const form = createElement("form", { enctype: "multipart/form-data" });
  container.appendChild(form);

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
      accept: acceptTypes,
      multiple: true,
    });
    form.appendChild(uploadInput);
  }

  // --- Submit ---
  if (isCreator && typeof onSubmit === "function") {
    const submitBtn = createElement(
      "button",
      { type: "submit", class: "btn btn-primary" },
      ["Update Images"]
    );

    form.appendChild(submitBtn);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      submitBtn.disabled = true;

      const payload = new FormData();

      // NOTE: this is now mostly informational unless backend supports it
      Array.from(keptImages).forEach(img =>
        payload.append("keepImages", img)
      );

      if (uploadInput && uploadInput.files.length > 0) {
        Array.from(uploadInput.files).forEach(file =>
          payload.append("images", file)
        );
      }

      try {
        Notify("Updating images...", {
          type: "info",
          duration: 1500,
          dismissible: true
        });

        const result = await onSubmit(payload);

        if (typeof onSuccess === "function") {
          onSuccess(result);
        }

      } catch (err) {
        Notify(
          `Error: ${err.message || "Failed to update images."}`,
          { type: "error", duration: 4000, dismissible: true }
        );
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  return container;
};

export default Galleryx;
export { Galleryx };
