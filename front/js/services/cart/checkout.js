import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { displayPayment } from "./payment.js";

/* ---------------- Address Form with Real-time Coupon Validation ---------------- */
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

  // Validation feedback element
  const couponFeedback = createElement("div", { 
    class: "coupon-feedback",
    style: "margin-top: 0.5rem; font-size: 0.9rem; min-height: 1.2rem;"
  });

  // Coupon validation state
  const currentCoupon = { code: "", valid: null, discount: 0, message: "" };
  let validationTimeout = null;

  // Real-time validation as user types
  couponInput.addEventListener("input", async (e) => {
    const code = e.target.value.trim();
    currentCoupon.code = code;

    // Clear previous timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // If empty, clear feedback
    if (!code) {
      currentCoupon.valid = null;
      currentCoupon.discount = 0;
      couponFeedback.replaceChildren("");
      return;
    }

    // Debounce validation (wait 500ms after user stops typing)
    validationTimeout = setTimeout(async () => {
      couponFeedback.replaceChildren("🔄 Validating coupon...");
      
      try {
        const result = await validateCoupon(code, 0, null, null);
        
        currentCoupon.valid = result.valid;
        currentCoupon.discount = result.discount;
        currentCoupon.message = result.message;

        // Update feedback UI
        if (result.valid) {
          couponFeedback.replaceChildren(
            createElement("span", { style: "color: green;" }, [
              `✓ ${result.message}`
            ])
          );
        } else {
          couponFeedback.replaceChildren(
            createElement("span", { style: "color: red;" }, [
              `✗ ${result.message}`
            ])
          );
        }
      } catch (_err) {
        couponFeedback.replaceChildren(
          createElement("span", { style: "color: red;" }, [
            "✗ Error validating coupon"
          ])
        );
        currentCoupon.valid = false;
      }
    }, 500);
  });

  const submitBtn = createElement("button", { 
    type: "submit",
    class: "primary-button"
  }, ["Proceed to Checkout"]);

  form.append(
    createElement("h2", {}, ["Delivery Details"]),
    createElement("label", {}, [
      createElement("span", {}, ["Enter Address:"]),
      addressInput
    ]),
    createElement("label", {}, [
      createElement("span", {}, ["Coupon Code (optional):"]),
      couponInput,
      couponFeedback
    ]),
    submitBtn
  );

  form.onsubmit = e => {
    e.preventDefault();

    // Warn if coupon was entered but is invalid
    if (currentCoupon.code && !currentCoupon.valid) {
      alert("⚠️ The coupon code is invalid. Please remove it or enter a valid code.");
      return;
    }

    // Pass validation results to callback
    onSubmit(
      addressInput.value.trim(),
      currentCoupon.code,
      currentCoupon.valid ? currentCoupon.discount : 0
    );
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
  // Early return for empty code
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return { valid: false, discount: 0, message: "No coupon code provided" };
  }

  try {
    const res = await apiFetch(
      "/coupon/validate",
      "POST",
      JSON.stringify({
        code: code.trim(),
        cart: subtotal,
        entityId,
        entityType
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    // Validate response structure
    if (!res) {
      console.error("Empty response from coupon validation");
      return { valid: false, discount: 0, message: "Server error validating coupon" };
    }

    // Check if coupon is valid
    if (res.valid === true) {
      const discount = Number(res.discount) || 0;
      if (discount < 0) {
        console.warn("Invalid discount amount:", discount);
        return { valid: false, discount: 0, message: "Invalid discount amount" };
      }
      return {
        valid: true,
        discount,
        message: res.message || `₹${discount} discount applied`
      };
    }

    // Coupon validation failed
    return {
      valid: false,
      discount: 0,
      message: res.message || "Invalid or expired coupon code"
    };
  } catch (err) {
    console.error("Coupon validation error:", err);
    return {
      valid: false,
      discount: 0,
      message: "Error validating coupon: " + (err.message || "Unknown error")
    };
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

    // New callback signature: (address, couponCode, discount) where discount is pre-validated
    renderAddressForm(container, async (address, couponCode, validatedDiscount) => {
      const subtotal = calculateSubtotal(items);
      const { category } = items[0] || {};

      // Discount is already validated by the form, no need to re-validate
      const discount = validatedDiscount || 0;

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

        createElement("div", { style: "margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ccc;" }, [
          createElement("div", {}, [`Subtotal: ₹${subtotal.toFixed(2)}`]),
          ...(discount > 0
            ? [
                createElement(
                  "div",
                  { style: "color: green; font-weight: bold;" },
                  [
                    `✓ Coupon Applied: −₹${discount.toFixed(2)}`
                  ]
                )
              ]
            : []),
          createElement("div", { style: "font-weight: bold; font-size: 1.1em; margin-top: 0.5rem;" }, [
            `Total: ₹${(subtotal - discount).toFixed(2)}`
          ])
        ]),

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
          // ✅ Build complete session data with pre-validated discount
          const sessionData = {
            address,
            items, // flat array - preserve the filtered items
            category, // track which category is being checked out
            couponCode, // coupon code (can be empty)
            discount // already validated by form (0 if empty or invalid)
          };

          // Create session on backend
          const session = await apiFetch(
            "/checkout/session",
            "POST",
            JSON.stringify(sessionData),
            { headers: { "Content-Type": "application/json" } }
          );

          // Pass merged session data, but don't let backend items override client items
          displayPayment(container, { 
            ...session, 
            items, 
            address, 
            category, 
            couponCode: sessionData.couponCode,
            discount: sessionData.discount // use locked-in discount from form
          });

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
