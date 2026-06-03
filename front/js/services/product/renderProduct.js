// renderProduct.js

import { createElement } from "../../components/createElement";
import { normalizeProduct } from "./productHelpers.js";
import { renderProductGallery } from "./renderProductGallery.js";
import { renderProductBasicInfo } from "./renderProductBasicInfo.js";
import { renderProductActions } from "./renderProductActions.js";

export function renderProduct(
  productOriginal,
  isLoggedIn,
  productType,
  productId,
  container,
  refresh
) {
  const product = normalizeProduct(productOriginal);

  const gallerySection = renderProductGallery(product);
  const basicInfo = renderProductBasicInfo(product);

  const actions = renderProductActions(
    product,
    productType,
    productId,
    container,
    refresh
  );

  const page = createElement("div", { class: "product-page" }, [
    gallerySection,
    basicInfo,
    actions,
  ]);

  return page;
}