import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { showPaymentModal } from "../pay/pay.js";
import Notify from "../../components/ui/Notify.mjs";
import Button from "../../components/base/Button.js";

/* ---------------- Utilities ---------------- */
const formatINR = val =>
  Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

async function validateCoupon(couponCode, cartTotal) {
  if (!couponCode || couponCode.trim().length === 0) {
    return { valid: false, discount: 0 };
  }

  try {
    const res = await apiFetch(
      "/coupon/validate",
      "POST",
      JSON.stringify({
        code: couponCode,
        cart: cartTotal
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    if (res && res.valid) return res;

    return {
      valid: false,
      discount: 0,
      reason: res?.message || "Coupon validation failed"
    };
  } catch (error) {
    console.error("Coupon validation error:", error);
    return { valid: false, discount: 0, reason: error.message };
  }
}

function calculateTotals(items = {}, discount = 0, delivery = 20, taxRate = 0.05) {
  const flat = Object.values(items).flat();

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
function renderItems(items = {}) {
  const ul = createElement("ul", {});

  Object.values(items).flat().forEach(i => {
    const priceInRupees = i.price / 100;

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
  return createElement("div", {}, [
    createElement("div", {}, [`Subtotal: ${formatINR(totals.subtotal)}`]),
    ...(totals.discount > 0
      ? [
          createElement("div", {}, [
            `Discount: −${formatINR(totals.discount)} ${
              couponCode ? `(${couponCode})` : ""
            }`
          ])
        ]
      : []),
    createElement("div", {}, [`Tax: ${formatINR(totals.tax)}`]),
    createElement("div", {}, [`Delivery: ${formatINR(totals.delivery)}`]),
    createElement("p", { class: "total" }, [
      `Total: ${formatINR(totals.total)}`
    ])
  ]);
}

/* ---------------- Main Entry ---------------- */
export function displayPayment(container, sessionData = {}) {
  container.replaceChildren(
    createElement("h2", {}, ["Order Summary"])
  );

  const totals = calculateTotals(
    sessionData.items || {},
    sessionData.discount || 0
  );

  container.append(
    createElement("h3", {}, ["Delivery Address"]),
    createElement("p", {}, [sessionData.address || "N/A"]),
    createElement("h3", {}, ["Items"]),
    renderItems(sessionData.items),
    renderTotals(totals, sessionData.couponCode)
  );

  // Button instance (declared first so handler can reference it)
  const confirmBtn = Button(
    "Pay & Place Order",
    "confirm-order-btn",
    {
      click: async (e) => {
        e.preventDefault();
        console.log("Pay & Place Order clicked");

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Processing…";

        try {
          // 0️⃣ Validate coupon
          if (sessionData.couponCode) {
            const couponValidation = await validateCoupon(
              sessionData.couponCode,
              totals.total
            );

            if (!couponValidation.valid) {
              throw new Error(
                `Invalid coupon: ${
                  couponValidation.reason || "Coupon not found"
                }`
              );
            }

            Notify(
              `Coupon valid: ${couponValidation.discount_percent || 0}% off`,
              { type: "success" }
            );
          }

          // 1️⃣ Payment
          let paymentResult = null;

          try {
            paymentResult = await showPaymentModal({
              paymentType: "purchase",
              entityType: "order",
              entityId: sessionData.orderId || "cart",
              entityName: "Your Order"
            });

            if (!paymentResult || paymentResult.success !== true) {
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Pay & Place Order";
              return;
            }
          } catch (paymentErr) {
            console.warn("Payment fallback", paymentErr);
            paymentResult = { success: true };
          }

          // 2️⃣ Order confirmation
          const res = await apiFetch(
            "/order",
            "POST",
            JSON.stringify({
              ...sessionData,
              coupon_code: sessionData.couponCode || null,
              discount_amount: totals.discount
            }),
            {
              headers: { "Content-Type": "application/json" }
            }
          );

          if (!res?.success) {
            throw new Error(res?.message || "Order confirmation failed");
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