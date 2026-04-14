import { createElement } from "../../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { ImageGallery } from "../../components/ui/IMageGallery.mjs";

export function renderProductGallery(product) {
  const gallerySection = createElement("div", { class: "gallery-section" }, []);

  if (Array.isArray(product.images) && product.images.length > 0) {
    const imageUrls = product.images.map((name) =>
      resolveImagePath(EntityType.PRODUCT, PictureType.PHOTO, name)
    );
    gallerySection.appendChild(ImageGallery(imageUrls));
  } else {
    gallerySection.appendChild(
      createElement("p", { class: "no-images" }, ["No images available"])
    );
  }

  return gallerySection;
}
