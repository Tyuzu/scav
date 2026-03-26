import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

export async function addToCart({
  itemId = "",
  entityId = "",
  entityType = "",
  quantity = 0,
  isLoggedIn = false
}) {
  if (!isLoggedIn) {
    Notify("Please log in to add items to your cart", {
      type: "warning",
      duration: 3000
    });
    return;
  }

  const qty = Number(quantity);

  if (!itemId || !Number.isFinite(qty) || qty <= 0) {
    Notify("Invalid item data", {
      type: "warning",
      duration: 3000
    });
    return;
  }

  const payload = {
    itemId,
    quantity: qty
  };

  if (entityId) payload.entityId = entityId;
  if (entityType) payload.entityType = entityType;

  try {
    await apiFetch(
      "/cart",
      "POST",
      JSON.stringify(payload),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    Notify("Added to cart", {
      type: "success",
      duration: 3000
    });
  } catch (err) {
    console.error("Add to cart failed:", err);
    Notify("Failed to add item to cart", {
      type: "error",
      duration: 3000
    });
  }
}
