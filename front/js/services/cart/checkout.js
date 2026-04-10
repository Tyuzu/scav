import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { displayPayment } from "./payment.js";

/* ---------------- Address Form ---------------- */
function renderAddressForm(container, onSubmit) {
  const form = createElement("form", { class: "address-form" });

  const addressInput = createElement("textarea", {
    required: true,
    placeholder: "Flat No, Street, City, State, ZIP",
    rows: 3,
    class: "address-input"
  });

  const couponInput = createElement("input", {
    type: "text",
    class: "coupon-input",
    placeholder: "Enter coupon code (optional)"
  });

  form.append(
    createElement("h2", {}, ["Delivery Details"]),
    createElement("label", {}, [
      createElement("span", {}, ["Enter Address:"]),
      addressInput
    ]),
    createElement("label", {}, [
      createElement("span", {}, ["Coupon Code:"]),
      couponInput
    ]),
    createElement("button", { type: "submit", class: "primary-button" }, [
      "Proceed to Checkout"
    ])
  );

  form.onsubmit = e => {
    e.preventDefault();
    onSubmit(addressInput.value.trim(), couponInput.value.trim());
  };

  container.replaceChildren(form);
}

/* ---------------- Helpers ---------------- */
function calculateSubtotal(items = []) {
  return items.reduce(
    (sum, i) => sum + ((i.price || 0) / 100) * (i.quantity || 0),
    0
  );
}

async function validateCoupon(code, subtotal, entityId, entityType) {
  if (!code) return { valid: false, discount: 0 };

  try {
    const res = await apiFetch(
      "/coupon/validate",
      "POST",
      JSON.stringify({
        code,
        cart: subtotal,
        entityId,
        entityType
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      valid: !!res.valid,
      discount: Number(res.discount) || 0
    };
  } catch (err) {
    console.error(err);
    return { valid: false, discount: 0 };
  }
}

/* ---------------- Main ---------------- */
export async function displayCheckout(container, passedItems = null) {
  container.replaceChildren(
    createElement("p", { class: "loading" }, ["Loading your cart..."])
  );

  try {
    const items = passedItems || await apiFetch("/cart", "GET");

    if (!Array.isArray(items) || items.length === 0) {
      container.replaceChildren(
        createElement("p", { class: "empty" }, ["Nothing to checkout"])
      );
      return;
    }

    renderAddressForm(container, async (address, couponCode) => {
      const subtotal = calculateSubtotal(items);
      const { entityId, entityType } = items[0] || {};

      const coupon = await validateCoupon(
        couponCode,
        subtotal,
        entityId,
        entityType
      );

      const summary = createElement("section", { class: "checkout-summary" });

      summary.append(
        createElement("h2", {}, ["Checkout Summary"]),

        createElement(
          "ul",
          {},
          items.map(i => {
            const priceInRupees = (i.price || 0) / 100;
            return createElement("li", {}, [
              `${i.itemName} – ${i.quantity} × ₹${priceInRupees.toFixed(2)} `,
              createElement("strong", {}, [
                `= ₹${(priceInRupees * i.quantity).toFixed(2)}`
              ])
            ]);
          })
        ),

        createElement("div", {}, [`Subtotal: ₹${subtotal.toFixed(2)}`]),

        ...(couponCode
          ? [
              createElement(
                "div",
                { class: coupon.valid ? "coupon-valid" : "coupon-invalid" },
                [
                  coupon.valid
                    ? `Discount: −₹${coupon.discount}`
                    : `Invalid coupon: ${couponCode}`
                ]
              )
            ]
          : []),

        createElement(
          "button",
          { class: "primary-button", id: "proceedPayment" },
          ["Proceed to Payment"]
        )
      );

      container.replaceChildren(summary);

      const btn = summary.querySelector("#proceedPayment");

      btn.onclick = async () => {
        btn.disabled = true;
        btn.replaceChildren("Preparing checkout…");

        try {
          // ✅ Pass validated coupon result forward
          const session = await apiFetch(
            "/checkout/session",
            "POST",
            JSON.stringify({
              address,
              items,
              couponCode,
              discount: coupon.valid ? coupon.discount : 0
            }),
            { headers: { "Content-Type": "application/json" } }
          );

          displayPayment(container, session);

        } catch (err) {
          console.error(err);
          btn.disabled = false;
          btn.replaceChildren("Proceed to Payment");

          summary.appendChild(
            createElement("div", { class: "error" }, [
              "Failed to start checkout."
            ])
          );
        }
      };
    });
  } catch (err) {
    console.error(err);
    container.replaceChildren(
      createElement("div", { class: "error" }, [
        "Failed to load cart."
      ])
    );
  }
}

// import { createElement } from "../../components/createElement.js";
// import { apiFetch } from "../../api/api.js";
// import { displayPayment } from "./payment.js";

// /* ---------------- Address Form ---------------- */
// function renderAddressForm(container, onSubmit) {
//   const form = createElement("form", { class: "address-form" });

//   const addressInput = createElement("textarea", {
//     required: true,
//     placeholder: "Flat No, Street, City, State, ZIP",
//     rows: 3,
//     class: "address-input"
//   });

//   const couponInput = createElement("input", {
//     type: "text",
//     class: "coupon-input",
//     placeholder: "Enter coupon code (optional)"
//   });

//   form.append(
//     createElement("h2", {}, ["Delivery Details"]),
//     createElement("label", {}, [
//       createElement("span", {}, ["Enter Address:"]),
//       addressInput
//     ]),
//     createElement("label", {}, [
//       createElement("span", {}, ["Coupon Code:"]),
//       couponInput
//     ]),
//     createElement("button", { type: "submit", class: "primary-button" }, [
//       "Proceed to Checkout"
//     ])
//   );

//   form.onsubmit = e => {
//     e.preventDefault();
//     onSubmit(addressInput.value.trim(), couponInput.value.trim());
//   };

//   container.replaceChildren(form);
// }

// /* ---------------- Helpers ---------------- */
// function calculateSubtotal(items = []) {
//   // CRITICAL FIX: Convert paise (int64) to rupees for calculation
//   return items.reduce(
//     (sum, i) => sum + ((i.price || 0) / 100) * (i.quantity || 0),
//     0
//   );
// }

// function groupItems(items = []) {
//   const grouped = {};
//   items.forEach(i => {
//     const key = i.category || "general";
//     grouped[key] = grouped[key] || [];
//     grouped[key].push(i);
//   });
//   return grouped;
// }

// async function validateCoupon(code, subtotal, entityId, entityType) {
//   if (!code) {
// return { valid: false, discount: 0 };
// }

//   try {
//     const res = await apiFetch("/coupon/validate", "POST", JSON.stringify({
//       code,
//       cart: subtotal,
//       entityId,
//       entityType
//     }), {
//       headers: { "Content-Type": "application/json" }
//     });

//     return {
//       valid: !!res.valid,
//       discount: Number(res.discount) || 0
//     };
//   } catch (err) {
//     console.error(err);
//     return { valid: false, discount: 0 };
//   }
// }

// /* ---------------- Main ---------------- */
// export async function displayCheckout(container, passedItems = null) {
//   container.replaceChildren(
//     createElement("p", { class: "loading" }, ["Loading your cart..."])
//   );

//   try {
//     const items = passedItems || await apiFetch("/cart", "GET");

//     if (!Array.isArray(items) || items.length === 0) {
//       container.replaceChildren(
//         createElement("p", { class: "empty" }, ["Nothing to checkout"])
//       );
//       return;
//     }

//     renderAddressForm(container, async (address, couponCode) => {
//       const subtotal = calculateSubtotal(items);
//       const { entityId, entityType } = items[0] || {};

//       const coupon = await validateCoupon(
//         couponCode,
//         subtotal,
//         entityId,
//         entityType
//       );

//       const summary = createElement("section", { class: "checkout-summary" });

//       summary.append(
//         createElement("h2", {}, ["Checkout Summary"]),
//         createElement(
//           "ul",
//           {},
//           items.map(i => {
//             // CRITICAL FIX: Convert price from paise (int64) to rupees for display
//             const priceInRupees = (i.price || 0) / 100;
//             return createElement("li", {}, [
//               `${i.itemName} – ${i.quantity} × ₹${priceInRupees.toFixed(2)} `,
//               createElement("strong", {}, [
//                 `= ₹${(priceInRupees * i.quantity).toFixed(2)}`
//               ])
//             ]);
//           })
//         ),
//         createElement("div", {}, [`Subtotal: ₹${subtotal.toFixed(2)}`]),
//         couponCode
//           ? createElement(
//               "div",
//               { class: coupon.valid ? "coupon-valid" : "coupon-invalid" },
//               [
//                 coupon.valid
//                   ? `Discount: −₹${coupon.discount}`
//                   : `Invalid coupon: ${couponCode}`
//               ]
//             )
//           : null,
//         createElement(
//           "button",
//           { class: "primary-button", id: "proceedPayment" },
//           ["Proceed to Payment"]
//         )
//       );

//       container.replaceChildren(summary);

//       const btn = summary.querySelector("#proceedPayment");
//       btn.onclick = async () => {
//         btn.disabled = true;
//         btn.replaceChildren("Preparing checkout…");

//         try {
//           // Create checkout session with all required data (include items for payment display)
//           const session = await apiFetch("/checkout/session", "POST", JSON.stringify({
//             address,
//             items, // CRITICAL FIX: Pass cart items so session includes them
//             coupon: couponCode,
//             discount: coupon.valid ? coupon.discount : 0,
//             paymentMethod: "" // Will be set during payment
//           }), {
//             headers: { "Content-Type": "application/json" }
//           });

//           displayPayment(container, session);
//         } catch (err) {
//           console.error(err);
//           btn.disabled = false;
//           btn.replaceChildren("Proceed to Payment");
//           summary.appendChild(
//             createElement("div", { class: "error" }, [
//               "Failed to start checkout."
//             ])
//           );
//         }
//       };
//     });
//   } catch (err) {
//     console.error(err);
//     container.replaceChildren(
//       createElement("div", { class: "error" }, [
//         "Failed to load cart."
//       ])
//     );
//   }
// }
