import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";

export async function openCartModal() {
  const wrapper = createElement("div", {
    style: "padding: 1rem; display: flex; flex-direction: column; gap: 1rem;"
  });

  let cart = [];
  try {
    const resp = await apiFetch("/cart", "GET");
    cart = Array.isArray(resp?.crops) ? resp.crops : [];
  } catch {
    wrapper.appendChild(createElement("p", {}, ["❌ Failed to load cart."]));
  }

  if (!cart.length) {
    wrapper.appendChild(createElement("p", {}, ["🛒 Your cart is empty."]));
    wrapper.appendChild(createElement("p", {}, ["Add items to see them here."]));
  } else {
    const grouped = groupCart(cart);
    const list = createElement("ul", { style: "list-style: none; padding: 0; margin: 0;" });

    grouped.forEach(item => {
      const label = `${item.itemName} (${item.quantity} ${item.unit || "kg"})`;
      const entityInfo = item.entityName ? ` from ${item.entityName}` : "";
      const price = `₹${(item.price * item.quantity).toFixed(2)}`;

      const li = createElement("li", {
        style: "display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0;"
      }, [
        createElement("span", {}, [label + entityInfo]),
        createElement("span", {}, [price])
      ]);
      list.appendChild(li);
    });

    const total = grouped.reduce((sum, item) => sum + item.quantity * item.price, 0);

    wrapper.appendChild(createElement("h4", {}, ["🛒 Your Cart"]));
    wrapper.appendChild(list);
    wrapper.appendChild(createElement("p", {
      style: "font-weight: bold; text-align: right;"
    }, [`Total: ₹${total.toFixed(2)}`]));
  }

  const goToCartButton = createElement("button", {
    style: `
      margin-top: 1rem;
      padding: 0.6rem 1.2rem;
      background-color: var(--color-accent);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `
  }, ["Go to Cart"]);

  const { close } = Modal({
    title: "Cart Preview",
    content: wrapper,
    size: "medium",
    closeOnOverlayClick: true,
    onClose: () => close()
  });

  goToCartButton.addEventListener("click", () => {
    close(); // Proper modal close using new API
    navigate("/cart");
  });

  wrapper.appendChild(goToCartButton);
}

function groupCart(items) {
  const map = {};
  items.forEach(it => {
    const key = it.itemId + (it.entityId || "");
    if (!map[key]) map[key] = { ...it };
    else map[key].quantity += it.quantity;
  });
  return Object.values(map);
}
