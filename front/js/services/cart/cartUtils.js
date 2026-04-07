import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";

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

    const subtotal = items.reduce(
      (sum, x) => sum + (x.price || 0) * (x.quantity || 0),
      0
    );

    sectionTotals[category] = subtotal;
    updateGrandTotal();

    subtotalDisplay.replaceChildren(
      createElement("strong", {}, ["Subtotal: "]),
      `₹${subtotal}`
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

    const pricing = [
      createElement("p", {}, [`Unit Price: ₹${it.price || 0}`]),
      createElement("p", {}, [
        `Subtotal: ₹${(it.price || 0) * (it.quantity || 1)}`
      ])
    ];

    const actions = createElement("div", { class: "action-row" }, [
      Button(
        "✕ Remove",
        "remove-btn",
        {
          click: () => {
            items.splice(index, 1);
            syncCategory().then(renderItems);
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

    item.quantity = Math.max(1, (item.quantity || 1) + delta);
    await syncCategory();
    renderItems();
  }

  async function syncCategory() {
    try {
      await apiFetch("/cart/update", "POST", {
        category,
        items
      });
    } catch (err) {
      console.error(`Cart sync failed for ${category}:`, err);
    }
  }
}

function capitalize(str = "") {
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}
