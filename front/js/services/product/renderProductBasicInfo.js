import { createElement } from "../../components/createElement";
import { getProductAvailability } from "./productHelpers.js";

export function renderProductBasicInfo(product) {
  // Safety checks for required fields
  const name = product?.name || "Unknown Product";
  const price = typeof product?.price === 'number' ? product.price : 0;
  const unit = product?.unit || "unit";
  
  const title = createElement("h1", { class: "product-title" }, [name]);

  const priceTag = createElement("div", { class: "product-price" }, [
    `₹${price.toFixed(2)} / ${unit}`,
  ]);

  const description = product?.description
    ? createElement("p", { class: "product-description" }, [product.description])
    : null;

  const category = product?.category
    ? createElement("p", { class: "product-category" }, [
        createElement("strong", {}, ["Category:"]),
        ` ${product.category}`,
      ])
    : null;

  const sku = product?.sku
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
