import { createElement } from "../../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { ImageGallery } from "../../components/ui/IMageGallery.mjs";

export function renderProductGallery(product) {
  const gallerySection = createElement("div", { class: "gallery-section" }, []);

  try {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      const validImages = product.images.filter(img => img && typeof img === 'string');
      
      if (validImages.length > 0) {
        const imageUrls = validImages.map((name) =>
          resolveImagePath(EntityType.PRODUCT, PictureType.PHOTO, name)
        );
        gallerySection.appendChild(ImageGallery(imageUrls));
      } else {
        gallerySection.appendChild(
          createElement("p", { class: "no-images" }, ["No valid images available"])
        );
      }
    } else {
      gallerySection.appendChild(
        createElement("p", { class: "no-images" }, ["No images available"])
      );
    }
  } catch (err) {
    console.error("Error rendering product gallery:", err);
    gallerySection.appendChild(
      createElement("p", { class: "no-images" }, ["Failed to load images"])
    );
  }

  return gallerySection;
}
