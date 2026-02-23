import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { showPaymentModal } from "../pay/pay.js";

/* ---------------- Utilities ---------------- */
const formatINR = val =>
  Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

/**
 * Use backend-calculated totals from session data.
 * Frontend DOES NOT calculate prices/taxes/totals - trusts backend
 */
function getTotals(sessionData = {}) {
  // Backend already calculated these
  return {
    subtotal: sessionData.subtotal || 0,
    discount: sessionData.discount || 0,
    tax: sessionData.tax || 0,
    delivery: sessionData.delivery || 0,
    total: sessionData.total || 0
  };
}

/* ---------------- Renderers ---------------- */
function renderItems(items = {}) {
  const ul = createElement("ul", {});
  Object.values(items).flat().forEach(i => {
    ul.append(
      createElement("li", {}, [
        `${i.itemName} – ${i.quantity} × ${formatINR(i.price)} = `,
        createElement("strong", {}, [formatINR(i.price * i.quantity)])
      ])
    );
  });
  return ul;
}

function renderTotals(totals, couponCode) {
  return createElement("div", {}, [
    createElement("div", {}, [`Subtotal: ${formatINR(totals.subtotal)}`]),
    ...(totals.discount > 0
      ? [createElement("div", {}, [`Discount: −${formatINR(totals.discount)} ${couponCode ? `(${couponCode})` : ""}`])]
      : []),
    createElement("div", {}, [`Tax: ${formatINR(totals.tax)}`]),
    createElement("div", {}, [`Delivery: ${formatINR(totals.delivery)}`]),
    createElement("p", { class: "total" }, [`Total: ${formatINR(totals.total)}`])
  ]);
}

/* ---------------- Main Entry ---------------- */
export function displayPayment(container, sessionData = {}) {
  container.replaceChildren(
    createElement("h2", {}, ["Order Summary"])
  );

  // Backend provides pre-calculated totals
  const totals = getTotals(sessionData);

  container.append(
    createElement("h3", {}, ["Delivery Address"]),
    createElement("p", {}, [sessionData.address || "N/A"]),
    createElement("h3", {}, ["Items"]),
    renderItems(sessionData.items),
    renderTotals(totals, sessionData.couponCode)
  );

  const confirmBtn = createElement(
    "button",
    { class: "primary-button", type: "button" },
    ["Pay & Place Order"]
  );

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.replaceChildren("Processing…");

    try {
      // 1️⃣ PAYMENT (authoritative)
      const paymentResult = await showPaymentModal({
        paymentType: "purchase",
        entityType: "order",
        entityId: sessionData.orderId || "cart",
        entityName: "Your Order"
      });

      if (!paymentResult || paymentResult.success !== true) {
        confirmBtn.disabled = false;
        confirmBtn.replaceChildren("Pay & Place Order");
        return;
      }

      // 2️⃣ ORDER CONFIRMATION (no payment data sent)
      const res = await apiFetch("/order", "POST", {
        ...sessionData
      });

      if (!res?.success) {
        throw new Error(res?.message || "Order confirmation failed");
      }

      container.replaceChildren(
        createElement("div", { class: "success-message" }, [
          "✅ Order placed successfully!"
        ])
      );
    } catch (err) {
      console.error(err);
      container.appendChild(
        createElement("div", { class: "error" }, [
          err.message || "❌ Order failed"
        ])
      );
      confirmBtn.disabled = false;
      confirmBtn.replaceChildren("Pay & Place Order");
    }
  };

  container.appendChild(confirmBtn);
}

// import { createElement } from "../../components/createElement.js";
// import { apiFetch } from "../../api/api.js";
// import { showPaymentModal } from "../pay/pay.js"; // adjust path if needed

// // ------------------ Utilities ------------------
// const formatINR = (val) =>
//   Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

// function calculateTotals(items = {}, discount = 0, delivery = 20, taxRate = 0.05) {
//   const flatItems = Object.values(items).flat();
//   const subtotal = flatItems.reduce(
//     (acc, { price = 0, quantity = 0 }) => acc + price * quantity,
//     0
//   );
//   const taxable = Math.max(0, subtotal - (Number(discount) || 0));
//   const tax = Number((taxable * taxRate).toFixed(2));
//   const total = Number((taxable + tax + delivery).toFixed(2));
//   return { subtotal, discount: Number(discount) || 0, tax, delivery, total };
// }

// // ------------------ Renderers ------------------
// function renderItems(items = {}) {
//   const ul = createElement("ul", {});
//   Object.entries(items).forEach(([cat, list]) => {
//     (list || []).forEach(
//       ({
//         itemName = "Item",
//         itemType,
//         quantity = 0,
//         unit = "",
//         entityName,
//         price = 0,
//       }) => {
//         const lineTotal = price * quantity;
//         ul.appendChild(
//           createElement("li", {}, [
//             `${itemName} (${itemType || "N/A"}) – ${quantity} ${unit || ""}${
//               entityName ? ` from ${entityName}` : ""
//             } – `,
//             createElement("span", { class: "price" }, [formatINR(lineTotal)]),
//           ])
//         );
//       }
//     );
//   });
//   return ul;
// }

// function renderTotals({ subtotal, discount, tax, delivery, total }, couponCode) {
//   const nodes = [
//     createElement("div", {}, [`Subtotal: ${formatINR(subtotal)}`]),
//     ...(discount > 0
//       ? [
//           createElement("div", {}, [
//             `Discount: −${formatINR(discount)} ${
//               couponCode ? `(${couponCode})` : ""
//             }`,
//           ]),
//         ]
//       : []),
//     createElement("div", {}, [`Tax (5%): ${formatINR(tax)}`]),
//     createElement("div", {}, [`Delivery: ${formatINR(delivery)}`]),
//     createElement("p", { class: "total" }, [`Total Amount: ${formatINR(total)}`]),
//   ];
//   return createElement("div", {}, nodes);
// }

// function renderPaymentMethodSelect(defaultId = "method") {
//   return createElement("div", { class: "payment-method" }, [
//     createElement("label", {}, [
//       "Select Payment Method: ",
//       createElement("select", { id: defaultId }, [
//         createElement("option", { value: "cod" }, ["Cash on Delivery"]),
//         createElement("option", { value: "upi" }, ["UPI"]),
//         createElement("option", { value: "card" }, ["Credit/Debit Card"]),
//         createElement("option", { value: "wallet" }, ["Wallet / Custom Payment"]),
//       ]),
//     ]),
//   ]);
// }

// // ------------------ Payment Handler ------------------
// async function handlePaymentMethod(method, sessionData) {
//   if (!method) return { success: false, message: "No payment method selected." };

//   method = method.toLowerCase();
//   const response = { success: false, method, details: null, message: "" };

//   try {
//     switch (method) {
//       case "cod":
//         response.success = true;
//         break;

//       case "upi":
//         response.success = true;
//         response.details = { type: "upi", note: "UPI payment placeholder" };
//         break;

//       case "card":
//         response.success = true;
//         response.details = { type: "card", note: "Card payment placeholder" };
//         break;

//       case "wallet":
//         const paymentResult = await showPaymentModal({
//           entityType: "order",
//           entityId: sessionData.orderId || "temp-order",
//           entityName: "Your Order",
//           amount: sessionData.total || sessionData.amount || 0,
//         });

//         if (!paymentResult?.success) {
//           return {
//             success: false,
//             method: "wallet",
//             message: "Wallet payment cancelled or failed.",
//           };
//         }

//         response.success = true;
//         response.method = paymentResult.method || "wallet";
//         response.details = paymentResult;
//         break;

//       default:
//         return { success: false, message: `Unsupported payment method: ${method}` };
//     }

//     return response;
//   } catch (err) {
//     console.error(`Payment error for method ${method}:`, err);
//     return {
//       success: false,
//       method,
//       message: err.message || "Unexpected payment error.",
//     };
//   }
// }

// // ------------------ Result Renderers ------------------
// function renderSuccess(container, result) {
//   container.replaceChildren();

//   const successBox = createElement("div", { class: "success-message" }, [
//     "🎉 Order placed successfully!",
//     createElement("br"),
//   ]);

//   // Farm Orders section
//   if (Array.isArray(result.farmOrders) && result.farmOrders.length > 0) {
//     successBox.appendChild(createElement("h3", {}, ["Farm Orders:"]));
//     result.farmOrders.forEach((fo, idx) => {
//       const farmName =
//         fo?.items?.crops?.[0]?.entityName || fo.farmid || "Unknown Farm";
//       const total =
//         fo?.items?.crops?.reduce(
//           (sum, i) => sum + (i.price || 0) * (i.quantity || 0),
//           0
//         ) || 0;

//       successBox.appendChild(
//         createElement("p", {}, [
//           `#${idx + 1} `,
//           createElement("strong", {}, [fo.orderid]),
//           ` (${fo.status}) – ${farmName} – ${formatINR(total)}`,
//         ])
//       );
//     });
//   }

//   // General order section
//   if (result.order) {
//     const o = result.order;
//     const total = o.total || 0;
//     successBox.appendChild(createElement("h3", {}, ["General Order:"]));
//     successBox.appendChild(
//       createElement("p", {}, [
//         createElement("strong", {}, [o.orderId]),
//         ` (${o.status}) – ${formatINR(total)}`,
//       ])
//     );
//   }

//   container.appendChild(successBox);

//   // Download receipts
//   const downloadBtn = createElement("button", { class: "secondary-button" }, [
//     "Download All Receipts",
//   ]);
//   downloadBtn.onclick = () => {
//     const blob = new Blob([JSON.stringify(result, null, 2)], {
//       type: "application/json",
//     });
//     const link = createElement("a", {
//       href: URL.createObjectURL(blob),
//       download: `orders_${Date.now()}.json`,
//     });
//     document.body.appendChild(link);
//     link.click();
//     setTimeout(() => {
//       URL.revokeObjectURL(link.href);
//       link.remove();
//     }, 1000);
//   };
//   container.appendChild(downloadBtn);

//   // Smooth scroll to view
//   container.scrollIntoView({ behavior: "smooth" });
// }

// function renderError(container, message = "❌ Failed to place order.") {
//   container.replaceChildren(createElement("div", { class: "error" }, [message]));
// }

// // ------------------ Confirm Button ------------------
// function renderConfirmButton(container, sessionData, totals) {
//   const btn = createElement("button", { class: "primary-button", type: "button" }, [
//     "Confirm Order",
//   ]);

//   async function resetButton() {
//     btn.disabled = false;
//     btn.replaceChildren("Confirm Order");
//   }

//   btn.onclick = async () => {
//     btn.disabled = true;
//     btn.replaceChildren("Processing...");

//     try {
//       const method = document.getElementById("method")?.value;
//       if (!method) {
//         await resetButton();
//         return;
//       }

//       const methodResult = await handlePaymentMethod(method, {
//         ...sessionData,
//         total: totals.total,
//       });
//       if (!methodResult.success) {
//         console.warn(methodResult.message || "Payment failed or cancelled.");
//         await resetButton();
//         return;
//       }

//       btn.replaceChildren("Placing order...");

//       const payload = {
//         ...sessionData,
//         paymentMethod: methodResult.method,
//         subtotal: totals.subtotal,
//         discount: totals.discount,
//         tax: totals.tax,
//         delivery: totals.delivery,
//         total: totals.total,
//         paymentDetails: methodResult.details || null,
//       };

//       const result = await apiFetch("/order", "POST", JSON.stringify(payload));

//       if (!result?.success)
//         throw new Error(result?.message || "Invalid response from server.");

//       renderSuccess(container, result);
//     } catch (err) {
//       console.error(err);
//       renderError(container, err?.message || "❌ Failed to place order.");
//     }
//   };

//   return btn;
// }

// // ------------------ Main Entry ------------------
// export function displayPayment(container, sessionData = {}) {
//   container.replaceChildren();
//   container.appendChild(createElement("h2", {}, ["Payment Summary"]));

//   const summary = createElement("div", { class: "payment-details" });
//   const totals = calculateTotals(sessionData.items || {}, sessionData.discount || 0);

//   summary.appendChild(createElement("h3", {}, ["Shipping Address"]));
//   summary.appendChild(createElement("p", {}, [sessionData.address || "N/A"]));

//   summary.appendChild(createElement("h3", {}, ["Items"]));
//   summary.appendChild(renderItems(sessionData.items));

//   summary.appendChild(renderTotals(totals, sessionData.couponCode));
//   container.appendChild(summary);

//   const paymentMethodNode = renderPaymentMethodSelect();
//   container.appendChild(paymentMethodNode);

//   const confirmBtn = renderConfirmButton(container, sessionData, totals);
//   container.appendChild(confirmBtn);
// }
