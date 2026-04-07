import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

/**
 * Map itemType to backend category
 */
function getCategory(itemType = "", entityType = "") {
  if (!itemType) return entityType || "general";
  
  const typeMap = {
    "product": "products",
    "book": "products",
    "merch": "merchandise",
    "merchandise": "merchandise",
    "menu": "menu",
    "food": "menu",
    "crop": "crops",
    "farm": "crops",
    "service": "services"
  };
  
  return typeMap[itemType.toLowerCase()] || (entityType ? entityType.toLowerCase() : "general");
}

/**
 * Add item to cart with enhanced metadata support
 * @param {Object} options - Cart item options
 * @param {string} options.itemId - Unique item identifier (required)
 * @param {number} options.quantity - Quantity to add (default: 1)
 * @param {boolean} options.isLoggedIn - User login status (required)
 * @param {string} options.itemType - Type of item: 'product', 'merch', 'service', etc.
 * @param {string} options.itemName - Display name of the item
 * @param {string} options.entityType - Parent entity type: 'event', 'artist', 'farm', etc.
 * @param {string} options.entityId - Parent entity identifier
 * @param {string} options.entityName - Display name of parent entity
 */
export async function addToCart({
  itemId = "",
  quantity = 1,
  isLoggedIn = false,
  itemType = "",
  itemName = "",
  entityType = "",
  entityId = "",
  entityName = ""
}) {
  if (!isLoggedIn) {
    Notify("Please log in to add items to your cart", {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  const qty = Number(quantity);

  if (!itemId || !Number.isFinite(qty) || qty <= 0) {
    Notify("Invalid item data", {
      type: "warning",
      duration: 3000
    });
    return false;
  }

  const payload = {
    itemId,
    quantity: qty,
    category: getCategory(itemType, entityType)
  };

  // Add optional metadata for better cart display
  if (itemType) {
payload.itemType = itemType;
}
  if (itemName) {
payload.itemName = itemName;
}
  if (entityType) {
payload.entityType = entityType;
}
  if (entityId) {
payload.entityId = entityId;
}
  if (entityName) {
payload.entityName = entityName;
}

  try {
    const response = await apiFetch(
      "/cart",
      "POST",
      JSON.stringify(payload),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

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
