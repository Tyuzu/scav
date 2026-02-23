import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import Imagex from "./Imagex.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Sightbox from "../ui/Sightbox_zoom.mjs";

const Bannerx = ({
  isCreator = false,
  bannerkey = "",
  banneraltkey = "",
  bannerentitytype = "",
  stateentitykey = "",
  bannerentityid = ""
} = {}) => {
  // --- Container ---
  const bannerSection = createElement("div", { class: `${stateentitykey}-banner` });

  // --- Image ---
  const bannerSrc = resolveImagePath(bannerentitytype, PictureType.BANNER, bannerkey);
  const altText = banneraltkey || `${bannerentitytype} banner`;

  const bannerImage = Imagex({
    id: `${stateentitykey}${bannerentityid}-banner-img`,
    src: bannerSrc,
    alt: altText,
    loading: "lazy",
    classes: `${stateentitykey}-banner`
  });

  bannerImage.addEventListener("click", () => Sightbox(bannerSrc, "image"));

  bannerSection.appendChild(bannerImage);

  // --- Edit Button (if creator) ---
  if (isCreator === true) {
    const bannerEditButton = createElement("button", { class: "edit-banner-pic" }, ["Edit Banner"]);

    bannerEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: bannerentitytype,
        imageType: "banner",
        stateKey: "banner",
        stateEntityKey: stateentitykey,
        previewElementId: `${stateentitykey}${bannerentityid}-banner-img`,
        pictureType: PictureType.BANNER,
        entityId: bannerentityid
      });
    });

    bannerSection.appendChild(bannerEditButton);
  }

  return bannerSection;
};

export default Bannerx;
export { Bannerx };
