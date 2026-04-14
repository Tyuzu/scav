import { renderProduct } from "./renderProduct.js";
import { createElement } from "../../components/createElement";
import { fetchProduct, normalizeProduct } from "./productHelpers.js";

export async function displayProduct(isLoggedIn, productType, productId, contentContainer) {
  contentContainer.replaceChildren();

  try {
    const product = await fetchProduct(productType, productId);

    if (!product) {
      contentContainer.append(
        createElement("p", { class: "error" }, ["Product not found."])
      );
      return;
    }

    const page = renderProduct(product, isLoggedIn, productType, productId, contentContainer);
    contentContainer.append(page);
  } catch (err) {
    contentContainer.append(
      createElement("p", { class: "error" }, ["Failed to load product."])
    );
  }
}