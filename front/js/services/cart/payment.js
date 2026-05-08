import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { showPaymentModal } from "../pay/pay.js";
import Notify from "../../components/ui/Notify.mjs";
import Button from "../../components/base/Button.js";

/* ────────────────────── Helpers ────────────────────── */

const formatINR = v =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(v);

const toRupees = p => (p || 0) / 100;

const flattenItems = items =>
  Array.isArray(items) ? items : Object.values(items || {}).flat();

function groupByCategory(items = []) {
  return items.reduce((acc, item) => {
    const key = item.category || "general";

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push({
      itemId: item.itemId,
      quantity: item.quantity
    });

    return acc;
  }, {});
}

/* ────────────────────── Renderers ────────────────────── */

function renderItems(items) {
  const list = createElement("ul", {});

  flattenItems(items).forEach(i => {
    const price = toRupees(i.price);
    const total = price * i.quantity;

    list.append(
      createElement("li", {}, [
        `${i.itemName} – ${i.quantity} × ${formatINR(price)} = `,
        createElement("strong", {}, [formatINR(total)])
      ])
    );
  });

  return list;
}

function renderTotalsFromBackend(order) {
  const subtotal = toRupees(order.subtotal || 0);
  const discount = toRupees(order.discount || 0);
  const tax = toRupees(order.tax || 0);
  const delivery = toRupees(order.delivery || 0);
  const total = toRupees(order.total || 0);

  return createElement("div", { class: "payment-totals" }, [
    createElement("div", {}, [`Subtotal: ${formatINR(subtotal)}`]),

    ...(discount > 0
      ? [
        createElement("div", { class: "discount-line" }, [
          `Discount: −${formatINR(discount)}`
        ])
      ]
      : []),

    createElement("div", {}, [`Tax: ${formatINR(tax)}`]),
    createElement("div", {}, [`Delivery: ${formatINR(delivery)}`]),

    createElement("div", { class: "total-line" }, [
      `Total: ${formatINR(total)}`
    ])
  ]);
}

/* ────────────────────── API ────────────────────── */

async function createOrder({ items, address, couponCode }) {
  const payload = {
    address,
    items: groupByCategory(items),
    paymentMethod: "wallet",
    coupon_code: couponCode || null
  };

  const res = await apiFetch("/order", "POST", payload);

  if (!res?.success) {
    throw new Error(res?.message || "Order creation failed");
  }

  const order = res?.farmOrders?.[0];

  if (!order?.orderid) {
    throw new Error("Missing order ID");
  }

  return order;
}

async function processPayment(orderId) {
  try {
    return await showPaymentModal({
      paymentType: "purchase",
      entityType: "order",
      entityId: orderId,
      entityName: "Order"
    });
  } catch (err) {
    console.warn("Payment error:", err);
    return null;
  }
}

/* ────────────────────── Main Entry ────────────────────── */

export function displayPayment(container, sessionData = {}) {
  container.replaceChildren(
    createElement("h2", {}, ["Order Summary"])
  );

  let items = flattenItems(sessionData.items);

  if (sessionData.category) {
    items = items.filter(i => i.category === sessionData.category);
  }

  container.append(
    createElement("h3", {}, ["Delivery Address"]),
    createElement("p", {}, [sessionData.address || "N/A"]),

    createElement("h3", {}, ["Items"]),
    renderItems(items)
  );

  // ⚠️ Totals will only show AFTER order is created (backend truth)
  const totalsContainer = createElement("div", {});
  container.append(totalsContainer);

  const confirmBtn = Button(
    "Pay & Place Order",
    "confirm-order-btn",
    { click: () => handleConfirm() },
    "primary-button"
  );

  container.append(confirmBtn);

  /* ────────────────────── Handler ────────────────────── */

  async function handleConfirm() {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing…";

    try {
      const order = await createOrder({
        items,
        address: sessionData.address,
        couponCode: sessionData.couponCode
      });

      // ✅ Now render backend totals
      totalsContainer.replaceChildren(
        renderTotalsFromBackend(order)
      );

      if (order.discount > 0) {
        Notify(
          `Discount applied: ${formatINR(toRupees(order.discount))}`,
          { type: "success", duration: 2000 }
        );
      }

      await processPayment(order.orderid);

      container.replaceChildren(
        createElement("div", { class: "success-message" }, [
          "Order placed successfully"
        ])
      );
    } catch (err) {
      console.error(err);

      container.append(
        createElement("div", { class: "error" }, [
          err.message || "Order failed"
        ])
      );

      confirmBtn.disabled = false;
      confirmBtn.textContent = "Pay & Place Order";
    }
  }
}