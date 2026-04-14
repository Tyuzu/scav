import Modal from "../../components/ui/Modal.mjs";
import { stripeFetch, apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";
import { Button } from "../../components/base/Button.js";

/* ───────────────────────────────────────── */
/* Payment Contract */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES = ["artist", "farmer", "creator", "donation", "funding"];

const PAYMENT_RULES = {
  funding: {
    allowedEntities: FUNDABLE_ENTITIES,
    methods: ["card"]
  },
  purchase: {
    allowedEntities: [
      "order",
      "cart",
      "menu",
      "booking",
      "product",
      "ticket",
      "merch",
      "crop",
      "service",
      "farm",
      "beat"
    ],
    methods: ["wallet", "card"]
  }
};

function validatePaymentConfig(paymentType, entityType) {
  if (!paymentType || !entityType) {
    console.error(`Invalid payment config: paymentType=${paymentType}, entityType=${entityType}`);
    return { valid: false, error: "Missing payment type or entity type" };
  }

  const rules = PAYMENT_RULES[paymentType];
  if (!rules) {
    console.error(`Unknown payment type: ${paymentType}`);
    return { valid: false, error: `Unknown payment type: ${paymentType}` };
  }

  if (!rules.allowedEntities.includes(entityType)) {
    console.error(`Entity type "${entityType}" not allowed for ${paymentType}. Allowed: ${rules.allowedEntities.join(", ")}`);
    return { valid: false, error: `Entity type "${entityType}" not supported for ${paymentType} payments` };
  }

  return { valid: true };
}

/* ───────────────────────────────────────── */
/* Stripe Loader */
/* ───────────────────────────────────────── */

let stripePromise = null;

function loadStripeJs(key) {
  if (stripePromise) {
return stripePromise;
}

  stripePromise = new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe(key));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () =>
      window.Stripe
        ? resolve(window.Stripe(key))
        : reject(new Error("Stripe.js failed to initialize"));
    script.onerror = () =>
      reject(new Error("Failed to load Stripe.js"));
    document.head.appendChild(script);
  });

  return stripePromise;
}

/* ───────────────────────────────────────── */
/* Stripe Payment (Card) */
/* ───────────────────────────────────────── */

async function payViaStripe({
  paymentType = "purchase",
  entityType,
  entityId
}) {
  const validation = validatePaymentConfig(paymentType, entityType);
  if (!validation.valid) {
    console.error("Payment validation failed:", validation.error);
    return { success: false, error: validation.error };
  }

  const stripe = await loadStripeJs(STRIPE_PUB_KEY);

  let resolveResult;
  const resultPromise = new Promise(resolve => {
    resolveResult = resolve;
  });

  const modal = Modal({
    title:
      paymentType === "funding"
        ? "Support Creator"
        : "Complete Payment",
    size: "small",
    returnDataOnClose: false,

    content: () => {
      const container = createElement("div", {
        id: "stripe-elements-container"
      });

      container.append(
        createElement("div", { id: "card-element" }),
        createElement("div", {
          id: "payment-message",
          class: "payment-message"
        })
      );

      return container;
    },

    onOpen: async () => {
      const elements = stripe.elements();
      const card = elements.create("card");

      if (!document.querySelector("#card-element iframe")) {
        card.mount("#card-element");
      }

      const payBtn = createElement(
        "button",
        { type: "button" },
        ["Pay"]
      );

      const messageEl =
        document.getElementById("payment-message");

      payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        messageEl.textContent = "Processing…";

        try {
          const res = await stripeFetch(
            "/create-payment-intent",
            "POST",
            { paymentType, entityType, entityId }
          );

          const { error, paymentIntent } =
            await stripe.confirmCardPayment(
              res.clientSecret,
              { payment_method: { card } }
            );

          if (error) {
throw error;
}

          await stripeFetch("/payment-success", "POST", {
            paymentType,
            entityType,
            entityId,
            paymentIntentId: paymentIntent.id
          });

          resolveResult({ success: true });
          setTimeout(() => modal.close(), 300);

        } catch (err) {
          console.error("Stripe payment failed:", err);
          messageEl.textContent = "Payment failed";
          payBtn.disabled = false;
          resolveResult({ success: false });
        }
      });

      document
        .getElementById("stripe-elements-container")
        .appendChild(payBtn);
    },

    onClose: () => {
      resolveResult({ success: false });
    }
  });

  return resultPromise;
}

/* ───────────────────────────────────────── */
/* Wallet + Payment Selection Modal */
/* ───────────────────────────────────────── */

async function showPaymentModal({
  paymentType = "purchase",
  entityType,
  entityId,
  entityName
}) {
  // Validate payment configuration
  const validation = validatePaymentConfig(paymentType, entityType);
  if (!validation.valid) {
            console.warn("Payment validation failed:", validation.error);
  }

  const rules = PAYMENT_RULES[paymentType];

  const confirmBtn = Button(
    "Confirm Payment",
    "",
    {
      click: async () => {
        const method =
          document.querySelector("input[name=paymethod]:checked")?.value;

        if (!method) {
          console.warn("No payment method selected");
          return;
        }

        // Disable button and show loading state
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = "Processing…";

        try {
          if (method === "card") {
            const res = await payViaStripe({
              paymentType,
              entityType,
              entityId
            });

            modalRef.close({ success: res?.success === true });
            return;
          }

          if (method === "wallet") {
            try {
              const res = await apiFetch("/wallet/pay", "POST", JSON.stringify({
                paymentType,
                entityType,
                entityId
              }), {
                headers: { "Content-Type": "application/json" }
              });

              console.warn("Wallet payment response:", res);

              // Check if payment was successful
              if (res && res.success) {
                modalRef.close({ success: true });
              } else {
                console.error("Wallet payment failed:", res?.message || "Unknown error");
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                alert(res?.message || "Payment failed. Please try again.");
              }
            } catch (err) {
              console.error("Wallet payment error:", err);
              confirmBtn.disabled = false;
              confirmBtn.textContent = originalText;
              alert("Payment error: " + (err.message || "Unknown error"));
            }

            return;
          }

          // Default error for unknown method
          modalRef.close({ success: false });
        } catch (err) {
          console.error("Payment processing error:", err);
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
          alert("An error occurred: " + (err.message || "Unknown error"));
        }
      }
    },
    "buttonx"
  );

  modalRef = Modal({
    title: `Pay for ${entityName}`,
    content: createElement("div", {}, [
      ...rules.methods.map(m =>
        createElement("label", {}, [
          createElement("input", {
            type: "radio",
            name: "paymethod",
            value: m,
            checked: m === rules.methods[0]
          }),
          ` ${m.toUpperCase()}`
        ])
      )
    ]),
    actions: () => confirmBtn,
    returnDataOnClose: true
  });

  return modalRef.closed;
}

export { payViaStripe, showPaymentModal };