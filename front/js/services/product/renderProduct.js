// ===============================
// renderProduct.js (rewritten)
// ===============================

import { createElement } from "../../components/createElement";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { renderItemForm } from "../crops/products/createOrEdit.js";
import { displayProduct } from "./productPage.js";
import { ImageGallery } from "../../components/ui/IMageGallery.mjs";
import { addToCart } from "../cart/addToCart.js";

/* ---------------------------
   Main Renderer
---------------------------- */

export function renderProduct(productOriginal, isLoggedIn, productType, productId, container) {
  const product = normalizeProduct(productOriginal);

  let quantity = 1;

  const quantityValue = createElement("span", { class: "quantity-value" }, [String(quantity)]);
  const updateQuantityDisplay = () => quantityValue.replaceChildren(String(quantity));

  const setQuantity = (n) => {
    quantity = n;
    updateQuantityDisplay();
  };

  const decrementBtn = Button("−", "", {
    click: () => {
      if (quantity > 1) setQuantity(quantity - 1);
    },
  }, "quantity-btn");

  const incrementBtn = Button("+", "", {
    click: () => setQuantity(quantity + 1),
  }, "quantity-btn");

  const quantityControl = createElement("div", { 
    class: "quantity-control",
    id: `qty-${productId}`   // <-- matches the label
  }, [
    decrementBtn,
    quantityValue,
    incrementBtn,
  ]);
  

  const handleAdd = () => {
    addToCart({
      itemId: product.productid,
      quantity,
      isLoggedIn,
    });
  };

  /* --------------------
     Image Gallery
  --------------------- */

  const gallerySection = createElement("div", { class: "gallery-section" }, [
    product.images.length
      ? ImageGallery(
          product.images.map((name) =>
            resolveImagePath(EntityType.PRODUCT, PictureType.PHOTO, name)
          )
        )
      : null,
  ]);

  /* --------------------
     Basic Info
  --------------------- */

  const title = createElement("h1", { class: "product-title" }, [product.name]);
  const priceTag = createElement("div", { class: "product-price" }, [
    `₹${product.price.toFixed(2)} / ${product.unit}`,
  ]);

  const description = product.description
    ? createElement("p", { class: "product-description" }, [product.description])
    : null;

  const entitySection = renderEntitySpecific(product, productType);

  /* --------------------
     Actions
  --------------------- */

  const actions = buildActions(product, quantityControl, productId, isLoggedIn, container, productType, handleAdd);

  /* --------------------
     Layout
  --------------------- */

  const contentSection = createElement("div", { class: "product-info-section" }, [
    title,
    priceTag,
    description,
    entitySection,
    actions,
  ]);

  return createElement("div", { class: `product-page ${productType}-layout` }, [
    gallerySection,
    contentSection,
  ]);
}

/* ---------------------------
   Helpers
---------------------------- */

function normalizeProduct(p) {
  return {
    ...p,
    name: p.name || "Unnamed",
    price: p.price || 0,
    unit: p.unit || "unit",
    images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
    type: p.type || "",
    description: p.description || "",
  };
}

function buildActions(product, quantityControl, productId, isLoggedIn, container, productType, handleAdd) {
  const addBtn = Button("Add to Cart", `add-${productId}`, { click: handleAdd }, "buttonx");

  const actions = createElement("div", { class: "product-actions" }, [
    createElement("div", { class: "quantity-wrapper" }, [
      createElement("label", { for: `qty-${productId}` }, ["Quantity:"]),
      quantityControl,
    ]),
    addBtn,
  ]);

  if (isLoggedIn) {
    const editBtn = Button("Edit", `edit-${productId}`, {
      click: () =>
        renderItemForm(container, "edit", product, productType, () => {
          displayProduct(isLoggedIn, productType, productId, container);
        }),
    }, "buttonx");
    actions.append(editBtn);
  }

  return actions;
}

/* ---------------------------
   Entity-Specific Renderers
---------------------------- */

const entityRenderers = {
  product: renderGenericProduct,
  tool: renderTool,
  subscription: renderSubscription,
  media: renderMedia,
  fmcg: renderFMCG,
  art: renderArt,
};

function renderEntitySpecific(product, type) {
  const renderer = entityRenderers[type];
  return renderer ? renderer(product) : createElement("div", { class: "entity-details" }, ["No additional details available."]);
}

function renderGenericProduct(p) {
  return renderSection("Details", {
    Size: p.size,
    Color: p.color,
    Weight: p.weight,
    Specs: objectToText(p.specs),
  });
}

function renderTool(p) {
  return renderSection("Tool Specifications", {
    Material: p.specs?.Material,
    Use: p.specs?.Use,
  });
}

function renderSubscription(p) {
  return renderSection("Subscription Details", {
    "Billing Cycle": p.billingCycle,
    "Trial Period": p.trialPeriod,
    Scope: p.scope,
    Duration: p.duration,
  });
}

function renderMedia(p) {
  return renderSection("Media Information", {
    Author: p.author,
    ISBN: p.isbn,
    Platform: p.platform,
    Version: p.version,
    License: p.license,
    Duration: p.duration,
  });
}

function renderFMCG(p) {
  return renderSection("Product Composition", {
    Ingredients: p.ingredients,
    "Expiry Date": p.expiryDate,
    Weight: p.weight,
  });
}

function renderArt(p) {
  return createElement("section", { class: "art-section" }, [
    createElement("div", { class: "art-card" }, [
      ...Object.entries({
        Artist: p.artist,
        Medium: p.medium,
        Dimensions: p.dimensions,
      })
        .filter(([_, v]) => v)
        .map(([label, value]) =>
          createElement("p", { class: "product-field" }, [`${label}: ${value}`])
        ),
    ]),
  ]);
}

/* ---------------------------
   Section Builder
---------------------------- */

function renderSection(title, data) {
  const rows = Object.entries(data)
    .filter(([_, v]) => v)
    .map(([label, value]) =>
      createElement("p", { class: "product-field" }, [`${label}: ${value}`])
    );

  if (!rows.length) return null;

  return createElement("section", { class: "details-section" }, [
    createElement("h3", { class: "section-title" }, [title]),
    ...rows,
  ]);
}

function objectToText(obj) {
  if (!obj) return null;
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}
