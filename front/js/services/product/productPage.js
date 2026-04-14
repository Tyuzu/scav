import { renderProduct } from "./renderProduct.js";
import { createElement } from "../../components/createElement";
import { fetchProduct } from "./productHelpers.js";

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

    try {
      const page = renderProduct(product, isLoggedIn, productType, productId, contentContainer);
      contentContainer.append(page);
    } catch (renderErr) {
      console.error("Error rendering product:", renderErr, "product data:", product);
      contentContainer.append(
        createElement("p", { class: "error" }, ["Failed to render product."])
      );
    }
  } catch (err) {
    console.error("Error in displayProduct:", err);
    contentContainer.append(
      createElement("p", { class: "error" }, ["Failed to load product."])
    );
  }
}