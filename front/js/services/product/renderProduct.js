import { createElement } from "../../components/createElement";
import { normalizeProduct } from "./productHelpers.js";
import { renderProductGallery } from "./renderProductGallery.js";
import { renderProductBasicInfo } from "./renderProductBasicInfo.js";
import { renderProductActions } from "./renderProductActions.js";

export function renderProduct(productOriginal, isLoggedIn, productType, productId, _container) {
  const product = normalizeProduct(productOriginal);

  const gallerySection = renderProductGallery(product);
  const basicInfo = renderProductBasicInfo(product);
  const actions = renderProductActions(product, productType, productId);

  const page = createElement("div", { class: "product-page" }, [
    gallerySection,
    basicInfo,
    actions,
  ]);

  return page;
}

