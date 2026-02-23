import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../createElement.js";
import Imagex from "./Imagex.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Sightbox from "../ui/Sightbox_zoom.mjs";

const Seatingx = ({
  isCreator = false,
  bannerkey = "",
  banneraltkey = "",
  bannerentitytype = "",
  stateentitykey = "",
  bannerentityid = "",
  bannerPicType="",
} = {}) => {
  // --- Container ---
  const bannerSection = createElement("div", { class: `${stateentitykey}-${bannerPicType}` });

  // --- Image ---
  const bannerSrc = resolveImagePath(bannerentitytype, bannerPicType, bannerkey);
  const altText = banneraltkey || `${bannerentitytype} banner`;

  const bannerImage = Imagex({
    id: `${stateentitykey}-${bannerPicType}-img`,
    src: bannerSrc,
    alt: altText,
    loading: "lazy",
    classes: `${stateentitykey}-${bannerPicType}`
  });

  bannerImage.addEventListener("click", () => Sightbox(bannerSrc, "image"));

  bannerSection.appendChild(bannerImage);

  // --- Edit Button (if creator) ---
  if (isCreator === true) {
    const bannerEditButton = createElement("button", { class: "edit-banner-pic" }, [`Edit ${bannerPicType}`]);

    bannerEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: bannerentitytype,
        imageType: bannerPicType,
        stateKey: bannerPicType,
        stateEntityKey: stateentitykey,
        previewElementId: `${stateentitykey}-${bannerPicType}-img`,
        pictureType: bannerPicType,
        entityId: bannerentityid
      });
    });

    bannerSection.appendChild(bannerEditButton);
  }

  return bannerSection;
};

export default Seatingx;
export { Seatingx };
