/* eslint-disable no-console */
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
    // preserve real backend category
    const key = item.category;

    if (!key) {
      console.error("Missing category on item:", item);
      return acc;
    }

    if (!acc[key]) {
      acc[key] = [];
    }

    // 🔒 SECURITY: Only send item ID and quantity - backend fetches current price
    acc[key].push({
      itemId: item.itemId,
      quantity: item.quantity,
      category: item.category,
      entityId: item.entityId,
      entityType: item.entityType
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
    coupon: couponCode || null
  };

  const res = await apiFetch("/order", "POST", payload);

  console.log("Order response:", res);

  if (!res?.success) {
    throw new Error(res?.message || "Order creation failed");
  }

  const order =
    res?.farmOrders?.[0] ||
    res?.order;

  const orderId =
    order?.orderid ||
    order?.orderId ||
    order?.OrderID;

  if (!orderId) {
    console.error("Invalid order response:", res);
    throw new Error("Missing order ID");
  }

  // Ensure we return order ID and total amount for payment processing
  return {
    ...order,
    orderid: orderId,
    total: order?.total || order?.totalAmount || 0
  };
}

async function processPayment(orderId, total) {
  try {
    return await showPaymentModal({
      paymentType: "purchase",
      entityType: "order",
      entityId: orderId,
      entityName: "Order",
      amount: total
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

      totalsContainer.replaceChildren(
        renderTotalsFromBackend(order)
      );

      if ((order.discount || 0) > 0) {
        Notify(
          `Discount applied: ${formatINR(
            toRupees(order.discount)
          )}`,
          {
            type: "success",
            duration: 2000
          }
        );
      }

      await processPayment(order.orderid, toRupees(order.total));

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