import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";

export function displayCropCard(crop) {
    const card = createElement("div", { class: "crop-card" });

    if (crop.banner) {
        const cropImg = Imagex( {
          src: resolveImagePath(EntityType.CROP, PictureType.BANNER, crop.banner),
          alt: crop.name,
          classes: "crop-card-image"
        });
        card.appendChild(cropImg);
      }
      

    card.append(
        createElement("h4", {}, [crop.name]),
        createElement("p", {}, [`💰 ₹${crop.price} per ${crop.unit}`]),
        createElement("p", {}, [`📦 In Stock: ${crop.quantity}`]),
        createElement("p", {}, [`👨‍🌾 Farm: ${crop.farmName || "Unknown"}`])
    );

    return card;
}
