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

  if (type && TYPE_MAP[type]) {
    return TYPE_MAP[type];
  }
  return entity || "general";
}

function validateInput({ itemId, quantity }) {
  const qty = Number(quantity);

  if (!itemId || typeof itemId !== "string") {
    return "Invalid item ID";
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    return "Invalid quantity";
  }

  return null;
}

function buildPayload(options) {
  const {
    itemId,
    quantity,
    itemType,
    itemName,
    entityType,
    entityId,
    entityName
  } = options;

  const payload = {
    itemId,
    quantity: Number(quantity),
    category: getCategory(itemType, entityType)
  };

  const optionalFields = {
    itemType,
    itemName,
    entityType: normalize(entityType),
    entityId,
    entityName
  };

  Object.entries(optionalFields).forEach(([key, value]) => {
    if (value) {
      payload[key] = value;
    }
  });

  return payload;
}

/**
 * Add item to cart
 */
export async function addToCart(options = {}) {
  const {
    isLoggedIn = false
  } = options;

  if (!isLoggedIn) {
    Notify("Please log in to add items to your cart", {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  const error = validateInput(options);
  if (error) {
    Notify(error, { type: "warning", duration: 3000 });
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

    Notify(err?.message || "Failed to add item to cart", {
      type: "error",
      duration: 3000
    });

    return false;
  }
}