import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { displayPayment } from "./payment.js";

/* ────────────────────── Helpers ────────────────────── */

const toRupees = (p = 0) => p / 100;
const formatPrice = v => `₹${v.toFixed(2)}`;

const calculateSubtotal = (items = []) =>
  items.reduce(
    (sum, i) => sum + toRupees(i.price) * (i.quantity || 0),
    0
  );

/* ────────────────────── Coupon API (UX only) ────────────────────── */

async function validateCoupon({ code, subtotal }) {
  if (!code?.trim()) {
    return { valid: null, discount: 0, message: "" };
  }

  try {
    const res = await apiFetch("/coupon/validate", "POST", {
      code: code.trim(),
      cart: subtotal
    });

    if (res?.valid) {
      const discount = Math.max(0, Number(res.discount) || 0);
      return {
        valid: true,
        discount,
        message: res.message || `${formatPrice(discount)} discount applied`
      };
    }

    return {
      valid: false,
      discount: 0,
      message: res?.message || "Invalid or expired coupon"
    };
  } catch (err) {
    console.error(err);
    return {
      valid: false,
      discount: 0,
      message: "Validation failed"
    };
  }
}

/* ────────────────────── Address Form ────────────────────── */

function renderAddressForm(container, { items, onSubmit }) {
  const subtotal = calculateSubtotal(items);

  const form = createElement("form", { class: "address-form" });

  const addressInput = createElement("textarea", {
    required: true,
    rows: 3,
    class: "address-input",
    placeholder: "Flat No, Street, City, State, ZIP"
  });

  const couponInput = createElement("input", {
    type: "text",
    class: "coupon-input",
    placeholder: "Enter coupon code (optional)"
  });

  const feedback = createElement("div", {
    class: "coupon-feedback"
  });

  let debounceTimer = null;
  let requestId = 0;

  const couponState = {
    code: "",
    valid: null,
    discount: 0 // UI only
  };

  couponInput.addEventListener("input", () => {
    const code = couponInput.value.trim();
    couponState.code = code;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!code) {
      couponState.valid = null;
      couponState.discount = 0;
      feedback.replaceChildren("");
      return;
    }

    debounceTimer = setTimeout(async () => {
      const currentRequest = ++requestId;

      feedback.replaceChildren("Validating…");

      const result = await validateCoupon({ code, subtotal });

      if (currentRequest !== requestId) {
        return;
      }

      couponState.valid = result.valid;
      couponState.discount = result.discount;

      feedback.replaceChildren(
        createElement(
          "span",
          { style: `color:${result.valid ? "green" : "red"}` },
          [result.message]
        )
      );
    }, 400);
  });

  form.onsubmit = e => {
    e.preventDefault();

    if (couponState.code && couponState.valid === false) {
      alert("Invalid coupon code");
      return;
    }

    onSubmit({
      address: addressInput.value.trim(),
      couponCode: couponState.code
      // discount intentionally NOT passed
    });
  };

  form.append(
    createElement("h2", {}, ["Delivery Details"]),
    createElement("label", {}, ["Address", addressInput]),
    createElement("label", {}, ["Coupon", couponInput, feedback]),
    createElement("button", { class: "primary-button", type: "submit" }, [
      "Proceed to Checkout"
    ])
  );

  container.replaceChildren(form);
}

/* ────────────────────── Summary View ────────────────────── */

function renderSummary(container, { items, address, couponCode }) {
  const subtotal = calculateSubtotal(items);

  const summary = createElement("section", { class: "checkout-summary" });

  const list = createElement(
    "ul",
    {},
    items.map(i => {
      const price = toRupees(i.price);
      const lineTotal = price * i.quantity;

      return createElement("li", {}, [
        `${i.itemName} – ${i.quantity} × ${formatPrice(price)} `,
        createElement("strong", {}, [`= ${formatPrice(lineTotal)}`])
      ]);
    })
  );

  const totals = createElement("div", {}, [
    createElement("div", {}, [`Subtotal: ${formatPrice(subtotal)}`]),
    createElement(
      "div",
      { style: "font-weight:bold" },
      ["Final total will be calculated at payment"]
    )
  ]);

  const btn = createElement(
    "button",
    { class: "primary-button" },
    ["Proceed to Payment"]
  );

  btn.onclick = () =>
    handleCheckout({
      container,
      button: btn,
      items,
      address,
      couponCode
    });

  summary.append(
    createElement("h2", {}, ["Checkout Summary"]),
    list,
    totals,
    btn
  );

  container.replaceChildren(summary);
}

/* ────────────────────── Checkout Handler ────────────────────── */

async function handleCheckout({
  container,
  button,
  items,
  address,
  couponCode
}) {
  button.disabled = true;
  button.textContent = "Processing…";

  try {
    // Only send safe data
    const sanitizedItems = items.map(i => ({
      itemId: i.itemId || i.id,
      quantity: i.quantity
    }));

    const session = await apiFetch("/checkout/session", "POST", {
      address,
      items: sanitizedItems,
      couponCode: couponCode || null
    });

    displayPayment(container, {
      ...session,
      items,
      address,
      couponCode
    });
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = "Proceed to Payment";
  }
}

/* ────────────────────── Main Entry ────────────────────── */

export async function displayCheckout(container, passedItems = null) {
  container.replaceChildren(
    createElement("p", { class: "loading" }, ["Loading..."])
  );

  try {
    const items = passedItems || (await apiFetch("/cart", "GET"));

    if (!Array.isArray(items) || !items.length) {
      container.replaceChildren(
        createElement("p", { class: "empty" }, ["Nothing to checkout"])
      );
      return;
    }

    renderAddressForm(container, {
      items,
      onSubmit: data =>
        renderSummary(container, {
          items,
          ...data
        })
    });
  } catch (err) {
    console.error(err);
    container.replaceChildren(
      createElement("div", { class: "error" }, ["Failed to load cart"])
    );
  }
}