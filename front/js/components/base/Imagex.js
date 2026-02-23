import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";

/**
 * Imagex component, wraps createElement for <img> with fallback & async decoding
 * Supports both `class` and legacy `classes`
 */
const Imagex = (attributes = {}) => {
  const { fallback = "/assets/icon-192.png", decodeAsync = true, classes, class: className, ...rest } = attributes;

  // Map legacy `classes` to `class` for createElement
  if (!rest.class && (className || classes)) {
    rest.class = className || classes;
  }

  // Create <img> using createElement
  const img = createElement("img", rest);

  // Async decoding
  if (decodeAsync) img.decoding = "async";

  // Fallback on error
  let triedFallback = false;
  img.onerror = () => {
    if (!triedFallback) {
      triedFallback = true;
      img.src = resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, fallback);
    }
  };

  return img;
};

export default Imagex;
export { Imagex };
