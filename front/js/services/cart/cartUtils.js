import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

/* ────────────────────── Constants & Helpers ────────────────────── */

const toRupees = (paise = 0) => paise / 100;

const formatPrice = (value = 0) => `₹${value.toFixed(2)}`;

const normalize = (v) =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

const capitalize = (str = "") =>
  str ? str[0].toUpperCase() + str.slice(1) : "";

const qtyUpdateTimers = new Map();

const getQtyTimerKey = (item, category) =>
  `${normalize(category)}:${item?.itemId ?? ""}:${item?.entityId ?? ""}:${normalize(
    item?.entityType
  )}`;

/* ────────────────────── API Layer ────────────────────── */

function buildPayload(base, entityId, entityType) {
  const payload = { ...base };

  if (entityId) {
    payload.entityId = entityId;
  }

  if (entityType) {
    payload.entityType = normalize(entityType);
  }

  return payload;
}

export const CartAPI = {
  remove(itemId, category, entityId, entityType) {
    return apiFetch(
      "/cart/item",
      "DELETE",
      buildPayload({ itemId, category }, entityId, entityType)
    );
  },

  updateQty(itemId, category, quantity, entityId, entityType) {
    return apiFetch(
      "/cart/item",
      "PATCH",
      buildPayload({ itemId, category, quantity }, entityId, entityType)
    );
  },

  clear() {
    return apiFetch("/cart", "DELETE");
  },

  updateCategory(category, items) {
    return apiFetch("/cart/update", "POST", { category, items });
  }
};

/* ────────────────────── Main Renderer ────────────────────── */

export function renderCartCategory({
  cart = {},
  category = "",
  contentContainer,
  sectionTotals = {},
  updateGrandTotal,
  displayCheckout
}) {
  const items = cart[category];

  if (!Array.isArray(items) || !items.length) {
    return;
  }

  const section = createElement("section", { class: "cart-category" });
  const cardsContainer = createElement("div", { class: "cart-cards" });
  const subtotalDisplay = createElement("p", { class: "cart-subtotal" });

  const header = createElement("div", { class: "cart-category-header" }, [
    createElement("h3", {}, [])
  ]);

  const checkoutBtn = Button(
    "Checkout",
    "checkoutbtn",
    {
      click: () => {
        if (items.length) {
          displayCheckout(contentContainer, items);
        }
      }
    },
    "buttonx primary"
  );

  section.append(header, cardsContainer, subtotalDisplay, checkoutBtn);
  contentContainer.appendChild(section);

  render();

  /* ────────────────────── Internal Logic ────────────────────── */

  function render() {
    if (!items.length) {
      cleanup();
      return;
    }

    updateHeader();
    renderItems();
    updateTotals();
  }

  function updateHeader() {
    header.firstChild.textContent = `${capitalize(category)} (${items.length})`;
    checkoutBtn.textContent = `Checkout ${capitalize(category)}`;
  }

  function renderItems() {
    cardsContainer.replaceChildren(
      ...items.map((item, i) => createCard(item, i))
    );
  }

  function updateTotals() {
    const subtotal = items.reduce(
      (sum, x) => sum + toRupees(x.price) * (x.quantity || 1),
      0
    );

    sectionTotals[category] = subtotal;
    updateGrandTotal();

    subtotalDisplay.replaceChildren(
      createElement("strong", {}, ["Subtotal: "]),
      formatPrice(subtotal)
    );
  }

  function cleanup() {
    for (const item of items) {
      clearQtyTimer(item);
    }

    section.remove();
    delete cart[category];
    delete sectionTotals[category];
    updateGrandTotal();
  }

  function createCard(item, index) {
    const price = toRupees(item.price);
    const qty = item.quantity || 1;

    return createElement("div", { class: "cart-card" }, [
      createDetails(item),
      createQuantityControls(index, qty),
      createPricing(price, qty),
      createActions(item, index)
    ]);
  }

  function createDetails(it) {
    const nodes = [
      createElement("p", {}, [`Item: ${it.itemName || "Item"}`])
    ];

    if (it.itemType) {
      nodes.push(createElement("p", {}, [`Type: ${it.itemType}`]));
    }

    if (it.entityName) {
      nodes.push(
        createElement("p", {}, [
          `${it.entityType || "Entity"}: ${it.entityName}`
        ])
      );
    }

    return createElement("div", { class: "cart-card-details" }, nodes);
  }

  function createQuantityControls(index, qty) {
    return createElement("div", { class: "quantity-line" }, [
      createElement("span", {}, ["Qty:"]),
      Button("−", "", { click: () => changeQty(index, -1) }, "buttonx subtle"),
      createElement("span", { class: "quantity-value" }, [String(qty)]),
      Button("+", "", { click: () => changeQty(index, 1) }, "buttonx subtle")
    ]);
  }

  function createPricing(price, qty) {
    return createElement("div", { class: "cart-card-pricing" }, [
      createElement("p", {}, [`Unit Price: ${formatPrice(price)}`]),
      createElement("p", {}, [`Subtotal: ${formatPrice(price * qty)}`])
    ]);
  }

  function createActions(item, index) {
    return createElement("div", { class: "action-row" }, [
      Button(
        "✕ Remove",
        "",
        { click: () => handleRemove(item, index) },
        "buttonx danger"
      ),
      Button(
        "♡ Save for Later",
        "",
        {
          click: () => {
            alert(`Saved "${item.itemName || "item"}" for later`);
          }
        },
        "buttonx secondary"
      )
    ]);
  }

  async function handleRemove(item, index) {
    try {
      clearQtyTimer(item);

      await CartAPI.remove(
        item.itemId,
        category,
        item.entityId,
        item.entityType
      );

      items.splice(index, 1);
      Notify("Item removed from cart", { type: "success", duration: 2000 });
      render();
    } catch (err) {
      console.error(err);
      Notify("Failed to remove item", { type: "error", duration: 3000 });
    }
  }

  function clearQtyTimer(item) {
    const key = getQtyTimerKey(item, category);
    const timer = qtyUpdateTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      qtyUpdateTimers.delete(key);
    }
  }

  function scheduleQtyUpdate(item) {
    const key = getQtyTimerKey(item, category);

    clearQtyTimer(item);

    const timer = setTimeout(async () => {
      qtyUpdateTimers.delete(key);

      try {
        await CartAPI.updateQty(
          item.itemId,
          category,
          item.quantity,
          item.entityId,
          item.entityType
        );
      } catch (err) {
        console.error(err);
        Notify("Failed to update quantity", {
          type: "error",
          duration: 3000
        });
      }
    }, 300);

    qtyUpdateTimers.set(key, timer);
  }

  function changeQty(index, delta) {
    const item = items[index];

    if (!item) {
      return;
    }

    const newQty = Math.max(1, (item.quantity || 1) + delta);

    item.quantity = newQty;
    render();
    scheduleQtyUpdate(item);
  }
}