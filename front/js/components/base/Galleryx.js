import { createElement } from "../createElement.js";
import {
  resolveImagePath,
  PictureType
} from "../../utils/imagePaths.js";

import Notify from "../ui/Notify.mjs";

const Galleryx = ({
  isCreator = false,
  existingImages = [],
  galleryEntityType = "",
  acceptTypes = "image/*",
  onSubmit = null,
  onSuccess = null,
} = {}) => {

  const container = createElement(
    "div",
    {
      class: "edit-images-section"
    }
  );

  const title = createElement(
    "h2",
    {},
    ["Add Images"]
  );

  container.append(title);

  const form = createElement("form");

  container.append(form);

  // ---------------------------------
  // EXISTING IMAGES
  // ---------------------------------

  const existingDiv = createElement(
    "div",
    {
      class: "existing-images"
    }
  );

  (existingImages || [])
    .filter(Boolean)
    .forEach(img => {

      const wrapper = createElement(
        "div",
        {
          class: "img-wrapper",
          style:
            "display:inline-block;margin:5px;"
        }
      );

      const imgEl = createElement(
        "img",
        {
          src: resolveImagePath(
            galleryEntityType,
            PictureType.PHOTO,
            img
          ),
          style:
            "max-width:120px;border:1px solid #ccc;border-radius:4px;"
        }
      );

      wrapper.append(imgEl);

      existingDiv.append(wrapper);
    });

  form.append(existingDiv);

  // ---------------------------------
  // NEW FILES
  // ---------------------------------

  let uploadInput = null;

  if (isCreator) {

    uploadInput = createElement(
      "input",
      {
        type: "file",
        accept: acceptTypes,
        multiple: true
      }
    );

    form.append(uploadInput);
  }

  // ---------------------------------
  // SUBMIT
  // ---------------------------------

  if (
    isCreator &&
    typeof onSubmit === "function"
  ) {

    const submitBtn = createElement(
      "button",
      {
        type: "submit",
        class: "btn btn-primary"
      },
      ["Upload Images"]
    );

    form.append(submitBtn);

    form.addEventListener(
      "submit",
      async e => {

        e.preventDefault();

        if (
          !uploadInput ||
          uploadInput.files.length === 0
        ) {

          Notify(
            "Please select at least one image.",
            {
              type: "warning",
              duration: 3000,
              dismissible: true
            }
          );

          return;
        }

        submitBtn.disabled = true;

        try {

          Notify(
            "Uploading images...",
            {
              type: "info",
              duration: 1500,
              dismissible: true
            }
          );

          const result =
            await onSubmit(
              Array.from(
                uploadInput.files
              )
            );

          if (
            typeof onSuccess ===
            "function"
          ) {

            onSuccess(result);
          }

        } catch (err) {

          Notify(
            `Error: ${
              err.message ||
              "Failed to upload images."
            }`,
            {
              type: "error",
              duration: 4000,
              dismissible: true
            }
          );

        } finally {

          submitBtn.disabled = false;
        }
      }
    );
  }

  return container;
};

export default Galleryx;
export { Galleryx };