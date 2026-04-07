// src/ui/cart/cartPage.js
import { createElement } from "../../components/createElement.js";
import { renderCartCategory } from "./cartUtils.js";
import { apiFetch } from "../../api/api.js";
import { displayCheckout } from "./checkout.js";
import Button from "../../components/base/Button.js";

/**
 * Display the user's cart.
 */
export async function displayCart(content, isLoggedIn) {
  const container = createElement("div", { class: "cartpage" });
  content.replaceChildren(container);

  if (!isLoggedIn) {
    renderMessage(container, "Please log in to view your cart.");
    return;
  }

  let serverCart;
  try {
    serverCart = await apiFetch("/cart", "GET");
  } catch (err) {
    console.error("Cart fetch failed:", err);
    renderMessage(container, "Failed to load cart. Try again.");
    return;
  }

  const grouped = groupCartByCategory(serverCart);
  const categories = Object.keys(grouped).filter(
    cat => Array.isArray(grouped[cat]) && grouped[cat].length
  );

  if (!categories.length) {
    renderMessage(container, "Your cart is empty.");
    return;
  }

  container.replaceChildren(
    createElement(
      "button",
      { class: "back-button", onclick: () => history.back() },
      ["← Back"]
    ),
    createElement("h2", {}, ["Your Cart"])
  );

  const sectionTotals = {};
  const grandTotalText = createElement("h3", { class: "grand-total" });

  categories.forEach(category => {
    renderCartCategory({
      cart: grouped,
      category,
      sectionTotals,
      updateGrandTotal,
      displayCheckout,
      contentContainer: container
    });
  });

  const checkoutAllBtn = Button(
    "Checkout All",
    "checkout-all-btn",
    {
      click: () => {
        const allItems = Object.values(grouped).flat();
        if (!allItems.length) {
return;
}
        displayCheckout(container, allItems);
      }
    },
    "buttonx primary"
  );

  const grandBox = createElement("div", { class: "grand-box" }, [
    grandTotalText,
    checkoutAllBtn
  ]);

  container.appendChild(grandBox);

  updateGrandTotal();

  /* ---------------- Internals ---------------- */

  function updateGrandTotal() {
    const total = Object.values(sectionTotals).reduce(
      (sum, val) => sum + (val || 0),
      0
    );
    grandTotalText.replaceChildren(`Grand Total: ₹${total}`);
  }
}

/**
 * Group cart items by category and merge duplicates
 */
function groupCartByCategory(cartData = {}) {
  const flat = Object.values(cartData).flat();

  const byCategory = {};
  flat.forEach(it => {
    const cat = it.category || "unknown";
    (byCategory[cat] = byCategory[cat] || []).push(it);
  });

  const grouped = {};
  for (const cat in byCategory) {
    const map = {};
    byCategory[cat].forEach(it => {
      const key = `${it.itemId || ""}__${it.entityId || ""}`;
      if (!map[key]) {
        map[key] = { ...it };
      } else {
        map[key].quantity += it.quantity || 0;
      }
    });
    grouped[cat] = Object.values(map);
  }

  return grouped;
}

function renderMessage(container, message) {
  container.replaceChildren(createElement("p", {}, [message]));
}
