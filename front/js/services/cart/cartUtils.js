import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

/**
 * Render a single cart category section
 */
export function renderCartCategory({
  cart = {},
  category = "",
  contentContainer,
  sectionTotals = {},
  updateGrandTotal,
  displayCheckout
}) {
  const items = cart[category];
  if (!Array.isArray(items) || items.length === 0) {
return;
}

  const section = createElement("section", { class: "cart-category" });

  const header = createElement("div", { class: "cart-category-header" }, [
    createElement("h3", {}, [`${capitalize(category)} (${items.length})`])
  ]);

  const cardsContainer = createElement("div", { class: "cart-cards" });
  const subtotalDisplay = createElement("p", { class: "cart-subtotal" });

  const checkoutBtn = Button(
    `Checkout ${capitalize(category)}`,
    "checkoutbtn",
    {
      click: () => {
        if (!items.length) {
return;
}
        displayCheckout(contentContainer, items);
      }
    },
    "buttonx primary"
  );

  section.append(header, cardsContainer, subtotalDisplay, checkoutBtn);
  contentContainer.appendChild(section);

  renderItems();

  /* ---------------- Internals ---------------- */

  function renderItems() {
    cardsContainer.replaceChildren();

    if (items.length === 0) {
      section.remove();
      delete cart[category];
      delete sectionTotals[category];
      updateGrandTotal();
      return;
    }

    items.forEach((item, index) => {
      cardsContainer.appendChild(createCard(item, index));
    });

    // CRITICAL FIX: Convert price from paise (int64) to rupees for calculation
    const subtotal = items.reduce(
      (sum, x) => sum + ((x.price || 0) / 100) * (x.quantity || 0),
      0
    );

    sectionTotals[category] = subtotal;
    updateGrandTotal();

    subtotalDisplay.replaceChildren(
      createElement("strong", {}, ["Subtotal: "]),
      `₹${subtotal.toFixed(2)}`
    );
  }

  function createCard(it = {}, index) {
    const details = [
      createElement("p", {}, [`Item: ${it.itemName || "Item"}`])
    ];

    if (it.itemType) {
details.push(createElement("p", {}, [`Type: ${it.itemType}`]));
}

    if (it.entityName) {
details.push(
        createElement("p", {}, [
          `${it.entityType || "Entity"}: ${it.entityName}`
        ])
      );
}

    const quantityLine = createElement("div", { class: "quantity-line" }, [
      createElement("span", {}, ["Qty:"]),
      Button("−", "qty-dec", { click: () => updateQty(index, -1) }, "buttonx subtle"),
      createElement("span", { class: "quantity-value" }, [
        String(it.quantity || 1)
      ]),
      Button("+", "qty-inc", { click: () => updateQty(index, 1) }, "buttonx subtle")
    ]);

    // CRITICAL FIX: Convert price from paise (int64) to rupees for display
    const priceInRupees = (it.price || 0) / 100;
    const pricing = [
      createElement("p", {}, [`Unit Price: ₹${priceInRupees.toFixed(2)}`]),
      createElement("p", {}, [
        `Subtotal: ₹${(priceInRupees * (it.quantity || 1)).toFixed(2)}`
      ])
    ];

    const actions = createElement("div", { class: "action-row" }, [
      Button(
        "✕ Remove",
        "remove-btn",
        {
          click: async () => {
            try {
              // CRITICAL FIX: Normalize entityType to lowercase for API consistency
              await removeItem(it.itemId, category, it.entityId, (it.entityType || "").toLowerCase());
              items.splice(index, 1);
              renderItems();
              updateGrandTotal();
              Notify("Item removed from cart", { type: "success", duration: 2000 });
            } catch (err) {
              console.error("Failed to remove item:", err);
              Notify("Failed to remove item", { type: "error", duration: 3000 });
            }
          }
        },
        "buttonx danger"
      ),
      Button(
        "♡ Save for Later",
        "wishlist-btn",
        {
          click: () =>
            alert(`Saved "${it.itemName || "item"}" for later!`)
        },
        "buttonx secondary"
      )
    ]);

    return createElement("div", { class: "cart-card" }, [
      createElement("div", { class: "cart-card-details" }, details),
      quantityLine,
      createElement("div", { class: "cart-card-pricing" }, pricing),
      actions
    ]);
  }

  async function updateQty(index, delta) {
    const item = items[index];
    if (!item) {
return;
}

    const newQty = Math.max(1, (item.quantity || 1) + delta);
    
    try {
      await updateItemQuantity(item.itemId, category, newQty, item.entityId, item.entityType);
      item.quantity = newQty;
      renderItems();
      updateGrandTotal();
    } catch (err) {
      console.error("Failed to update quantity:", err);
      Notify("Failed to update quantity", { type: "error", duration: 3000 });
    }
  }

  async function syncCategory() {
    try {
      await updateCartCategory(category, items);
    } catch (err) {
      console.error(`Cart sync failed for ${category}:`, err);
      Notify(`Failed to sync ${category} items`, { type: "error", duration: 3000 });
    }
  }
}

function capitalize(str = "") {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}

/* ────────────────────── Cart Item Operations ────────────────────── */

/**
 * Remove a single item from cart via backend API
 * @param {string} itemId - Item identifier
 * @param {string} category - Item category
 * @param {string} [entityId] - Optional entity ID
 * @param {string} [entityType] - Optional entity type
 * @returns {Promise<Object>} Updated grouped cart
 */
export async function removeItem(itemId, category, entityId = "", entityType = "") {
  const payload = {
    itemId,
    category
  };
  if (entityId) payload.entityId = entityId;
  if (entityType) payload.entityType = entityType;

  return await apiFetch("/cart/item", "DELETE", JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Update quantity of a single cart item via backend API
 * @param {string} itemId - Item identifier
 * @param {string} category - Item category
 * @param {number} quantity - New quantity
 * @param {string} [entityId] - Optional entity ID
 * @param {string} [entityType] - Optional entity type
 * @returns {Promise<Object>} Updated grouped cart
 */
export async function updateItemQuantity(itemId, category, quantity, entityId = "", entityType = "") {
  const payload = {
    itemId,
    category,
    quantity
  };
  if (entityId) payload.entityId = entityId;
  if (entityType) payload.entityType = entityType;

  return await apiFetch("/cart/item", "PATCH", JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Clear entire cart via backend API
 * @returns {Promise<Object>} Server response
 */
export async function clearCart() {
  return await apiFetch("/cart", "DELETE");
}

/**
 * Update all items in a category via backend API
 * @param {string} category - Item category
 * @param {Array} items - Array of cart items for this category
 * @returns {Promise<Object>} Updated grouped cart
 */
export async function updateCartCategory(category, items) {
  return await apiFetch("/cart/update", "POST", JSON.stringify({
    category,
    items
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
