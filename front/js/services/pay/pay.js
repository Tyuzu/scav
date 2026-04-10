import Modal from "../../components/ui/Modal.mjs";
import { stripeFetch, apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";
import { Button } from "../../components/base/Button.js";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";

/* ───────────────────────────────────────── */
/* Payment Contract */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES = ["artist", "farmer", "creator"];

const PAYMENT_RULES = {
  funding: {
    allowedEntities: FUNDABLE_ENTITIES,
    methods: ["card"]
  },
  purchase: {
    allowedEntities: ["order", "menu", "booking", "product", "ticket", "merch", "crop"],
    methods: ["wallet", "card"]
  }
};

function validatePaymentConfig(paymentType, entityType) {
  const rules = PAYMENT_RULES[paymentType];
  if (!rules) {
return false;
}
  if (!rules.allowedEntities.includes(entityType)) {
return false;
}
  return true;
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
  if (!validatePaymentConfig(paymentType, entityType)) {
    return { success: false, error: "Invalid payment configuration" };
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
  const rules = PAYMENT_RULES[paymentType];
  if (!rules || !rules.allowedEntities.includes(entityType)) {
    return { success: false };
  }

  let modalRef;

  const confirmBtn = Button(
    "Confirm Payment",
    "",
    {
      click: async () => {
        const method =
          document.querySelector("input[name=paymethod]:checked")?.value;

        if (!method) {
return;
}

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
            const res = await apiFetch("/wallet/pay", "POST", {
              paymentType,
              entityType,
              entityId
            });

            modalRef.close({ success: res?.success === true });
          } catch {
            modalRef.close({ success: false });
          }

          return;
        }

        modalRef.close({ success: false });
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