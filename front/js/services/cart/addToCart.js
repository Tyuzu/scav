import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

/**
 * Map itemType to backend category
 */
const TYPE_MAP = Object.freeze({
  product: "products",
  book: "products",
  merch: "merchandise",
  merchandise: "merchandise",
  menu: "menu",
  food: "menu",
  crop: "crops",
  farm: "crops",
  service: "services"
});

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getCategory(itemType = "", entityType = "") {
  const type = normalize(itemType);
  const entity = normalize(entityType);

  if (TYPE_MAP[type]) {
    return TYPE_MAP[type];
  }

  if (TYPE_MAP[entity]) {
    return TYPE_MAP[entity];
  }

  return entity || "general";
}

function validateInput({
  itemId,
  itemType,
  entityType,
  entityId,
  quantity
}) {
  const qty = Number(quantity);

  if (!itemId || typeof itemId !== "string") {
    return "Invalid item ID";
  }

  if (!itemType || typeof itemType !== "string") {
    return "Invalid item type";
  }

  if (!entityType || typeof entityType !== "string") {
    return "Invalid entity type";
  }

  if (!entityId || typeof entityId !== "string") {
    return "Invalid entity ID";
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    return "Invalid quantity";
  }

  return null;
}

function buildPayload(options) {
  const {
    itemId,
    itemType,
    quantity,
    itemName,
    entityType,
    entityId,
    entityName
  } = options;

  const payload = {
    itemId,
    itemType: normalize(itemType),
    entityType: normalize(entityType),
    entityId,
    quantity: Number(quantity),
    category: getCategory(itemType, entityType)
  };

  if (itemName) {
    payload.itemName = itemName;
  }

  if (entityName) {
    payload.entityName = entityName;
  }

  return payload;
}

/**
 * Add item to cart
 */
export async function addToCart(options = {}) {
  const { isLoggedIn = false } = options;

  if (!isLoggedIn) {
    Notify("Please log in to add items to your cart", {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  const error = validateInput(options);

  if (error) {
    Notify(error, {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  const payload = buildPayload(options);

  try {
    await apiFetch("/cart", "POST", payload);

    Notify("Added to cart successfully", {
      type: "success",
      duration: 3000
    });

    return true;
  } catch (err) {
    console.error("Add to cart failed:", err);

    Notify(
      err?.message || "Failed to add item to cart",
      {
        type: "error",
        duration: 3000
      }
    );

    return false;
  }
}