
/* ===============================
   displayProduct.js (rewritten)
=============================== */

import { renderProduct } from "./renderProduct.js";
import { createElement } from "../../components/createElement";
import { apiFetch } from "../../api/api";

export async function displayProduct(isLoggedIn, productType, productId, contentContainer) {
  contentContainer.replaceChildren();

  let product = null;

  try {
    product = await apiFetch(`/products/${productType}/${productId}`);
  } catch (_) {
    product = null;
  }

  if (!product) {
    contentContainer.append(
      createElement("p", { class: "error" }, ["Product not found."])
    );
    return;
  }

  const page = renderProduct(product, isLoggedIn, productType, productId, contentContainer);
  contentContainer.append(page);
}