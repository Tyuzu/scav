import { createElement } from "../../components/createElement";
import { getProductAvailability } from "./productHelpers.js";

export function renderProductBasicInfo(product) {
  const title = createElement("h1", { class: "product-title" }, [product.name]);

  const priceTag = createElement("div", { class: "product-price" }, [
    `₹${product.price.toFixed(2)} / ${product.unit}`,
  ]);

  const description = product.description
    ? createElement("p", { class: "product-description" }, [product.description])
    : null;

  const category = product.category
    ? createElement("p", { class: "product-category" }, [
        createElement("strong", {}, ["Category:"]),
        ` ${product.category}`,
      ])
    : null;

  const sku = product.sku
    ? createElement("p", { class: "product-sku" }, [
        createElement("strong", {}, ["SKU:"]),
        ` ${product.sku}`,
      ])
    : null;

  const availability = getProductAvailability(product);
  const availabilityStatus = createElement("p", { 
    class: `product-availability ${availability.isAvailable ? "available" : "unavailable"}` 
  }, [
    availability.isAvailable
      ? "✓ Available"
      : "✗ Currently unavailable",
  ]);

  return createElement("div", { class: "product-info" }, [
    title,
    priceTag,
    availabilityStatus,
    description,
    category,
    sku,
  ].filter(Boolean));
}
