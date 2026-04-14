import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { showPaymentModal } from "../pay/pay.js";
import Notify from "../../components/ui/Notify.mjs";
import Button from "../../components/base/Button.js";

/* ---------------- Utilities ---------------- */
const formatINR = val =>
  Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

function calculateTotals(items = [], discount = 0, delivery = 20, taxRate = 0.05) {
  const flat = Array.isArray(items) ? items : Object.values(items).flat();

  const subtotal = flat.reduce(
    (sum, { price = 0, quantity = 0 }) =>
      sum + (price / 100) * quantity,
    0
  );

  const taxable = Math.max(0, subtotal - discount);
  const tax = +(taxable * taxRate).toFixed(2);
  const total = +(taxable + tax + delivery).toFixed(2);

  return { subtotal, discount, tax, delivery, total };
}

/* ---------------- Renderers ---------------- */
function renderItems(items = []) {
  const ul = createElement("ul", {});

  const flat = Array.isArray(items) ? items : Object.values(items).flat();
  flat.forEach(i => {
    const priceInRupees = (i.price || 0) / 100;

    ul.append(
      createElement("li", {}, [
        `${i.itemName} – ${i.quantity} × ${formatINR(priceInRupees)} = `,
        createElement("strong", {}, [
          formatINR(priceInRupees * i.quantity)
        ])
      ])
    );
  });

  return ul;
}

function renderTotals(totals, couponCode) {
  return createElement("div", { 
    style: "margin-top: 1.5rem; padding: 1rem; background: #f9f9f9; border-radius: 4px;"
  }, [
    createElement("div", {}, [`Subtotal: ${formatINR(totals.subtotal)}`]),
    ...(totals.discount > 0
      ? [
          createElement("div", { 
            style: "color: green; font-weight: bold; margin: 0.5rem 0;"
          }, [
            `✓ Coupon Discount: −${formatINR(totals.discount)}${couponCode ? ` (${couponCode})` : ""}`
          ])
        ]
      : []),
    createElement("div", {}, [`Tax: ${formatINR(totals.tax)}`]),
    createElement("div", {}, [`Delivery: ${formatINR(totals.delivery)}`]),
    createElement("div", { 
      style: "border-top: 2px solid #333; margin-top: 0.5rem; padding-top: 0.5rem; font-size: 1.2em; font-weight: bold;"
    }, [
      `Total: ${formatINR(totals.total)}`
    ])
  ]);
}

/* ---------------- Main Entry ---------------- */
export function displayPayment(container, sessionData = {}) {
  container.replaceChildren(
    createElement("h2", {}, ["Order Summary"])
  );

  // Filter items by category if specified (ensures only selected category is shown)
  let itemsToDisplay = sessionData.items || [];
  if (sessionData.category && Array.isArray(itemsToDisplay)) {
    itemsToDisplay = itemsToDisplay.filter(item => item.category === sessionData.category);
  }

  const totals = calculateTotals(
    itemsToDisplay,
    sessionData.discount || 0
  );

  container.append(
    createElement("h3", {}, ["Delivery Address"]),
    createElement("p", {}, [sessionData.address || "N/A"]),
    createElement("h3", {}, ["Items"]),
    renderItems(itemsToDisplay),
    renderTotals(totals, sessionData.couponCode)
  );

  // Button instance (declared first so handler can reference it)
  const confirmBtn = Button(
    "Pay & Place Order",
    "confirm-order-btn",
    {
      click: async (e) => {
        e.preventDefault();

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Processing…";

        try {
          // 0️⃣ Coupon is already validated and locked in from checkout
          if (sessionData.couponCode && sessionData.discount > 0) {
            Notify(
              `✓ Coupon validated: ${sessionData.couponCode} (₹${sessionData.discount} off)`,
              { type: "success", duration: 2000 }
            );
          }

          // 1️⃣ Create order first
          // Group items by category for backend Order model
          const itemsByCategory = {};
          itemsToDisplay.forEach(item => {
            if (!itemsByCategory[item.category]) {
              itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push({
              itemId: item.itemId,
              itemName: item.itemName,
              quantity: item.quantity,
              price: item.price, // Already in paise
              category: item.category,
              entityId: item.entityId,
              entityName: item.entityName,
              entityType: item.entityType
            });
          });

          const orderPayload = {
            address: sessionData.address,
            items: itemsByCategory, // Grouped by category
            paymentMethod: "wallet", // Payment method
            coupon_code: sessionData.couponCode || null,
            discount_amount: Math.round((sessionData.discount || 0) * 100), // Convert ₹ to paise
            total: Math.round(totals.total * 100), // Convert ₹ to paise
            subtotal: Math.round(totals.subtotal * 100),
            tax: Math.round(totals.tax * 100),
            delivery: Math.round(totals.delivery * 100)
          };

          console.warn("Order payload:", orderPayload);

          const res = await apiFetch(
            "/order",
            "POST",
            JSON.stringify(orderPayload),
            {
              headers: { "Content-Type": "application/json" }
            }
          );

          if (!res?.success) {
            throw new Error(res?.message || "Order confirmation failed");
          }

          const orderId = res.order?.orderId || res.data?.id || res.data?.orderId || res.orderId || res.id;

          if (!orderId) {
            throw new Error("No order ID returned from server");
          }

          // 2️⃣ Process payment for the created order
          let paymentResult = null;

          try {
            paymentResult = await showPaymentModal({
              paymentType: "purchase",
              entityType: "order",
              entityId: orderId,
              entityName: "Your Order"
            });

            if (!paymentResult || paymentResult.success !== true) {
              console.warn("Payment was not completed for order:", orderId);
            }
          } catch (paymentErr) {
            console.warn("Payment processing error:", paymentErr);
          }

          container.replaceChildren(
            createElement("div", { class: "success-message" }, [
              "Order placed successfully!"
            ])
          );
        } catch (err) {
          console.error("Order error:", err);

          container.appendChild(
            createElement("div", { class: "error" }, [
              err.message || "Order failed"
            ])
          );

          confirmBtn.disabled = false;
          confirmBtn.textContent = "Pay & Place Order";
        }
      }
    },
    "primary-button"
  );

  container.appendChild(confirmBtn);
}