import Modal from "../../components/ui/Modal.mjs";
import { stripeFetch, apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";
import { Button } from "../../components/base/Button.js";

/* ───────────────────────────────────────── */
/* Payment Contract */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES = [
  "artist",
  "farmer",
  "creator",
  "donation",
  "funding"
];

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
      "farm"
    ],

    methods: ["wallet", "card", "cash_on_delivery"]
  }
};

function validatePaymentConfig(paymentType, entityType) {
  if (!paymentType || !entityType) {
    console.error(
      `Invalid payment config: paymentType=${paymentType}, entityType=${entityType}`
    );

    return {
      valid: false,
      error: "Missing payment type or entity type"
    };
  }

  const rules = PAYMENT_RULES[paymentType];

  if (!rules) {
    console.error(`Unknown payment type: ${paymentType}`);

    return {
      valid: false,
      error: `Unknown payment type: ${paymentType}`
    };
  }

  if (!rules.allowedEntities.includes(entityType)) {
    console.error(
      `Entity type "${entityType}" not allowed for ${paymentType}. Allowed: ${rules.allowedEntities.join(", ")}`
    );

    return {
      valid: false,
      error: `Entity type "${entityType}" not supported for ${paymentType} payments`
    };
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
    try {
      if (window.Stripe) {
        resolve(window.Stripe(key));
        return;
      }

      const script = document.createElement("script");

      script.src = "https://js.stripe.com/v3/";

      script.onload = () => {
        try {
          if (!window.Stripe) {
            reject(new Error("Stripe.js failed to initialize"));
            return;
          }

          resolve(window.Stripe(key));
        } catch (err) {
          reject(err);
        }
      };

      script.onerror = () => {
        reject(new Error("Failed to load Stripe.js"));
      };

      document.head.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });

  return stripePromise;
}

/* ───────────────────────────────────────── */
/* Helpers */
/* ───────────────────────────────────────── */

function createMessageElement() {
  return createElement("div", {
    class: "payment-message"
  });
}

function setMessage(el, message = "") {
  if (el) {
    el.textContent = message;
  }
}

/* ───────────────────────────────────────── */
/* Stripe Payment (Card) */
/* ───────────────────────────────────────── */

async function payViaStripe({
  paymentType = "purchase",
  entityType,
  entityId
}) {
  const validation = validatePaymentConfig(
    paymentType,
    entityType
  );

  if (!validation.valid) {
    console.error(
      "Payment validation failed:",
      validation.error
    );

    return {
      success: false,
      error: validation.error
    };
  }

  let stripe;

  try {
    stripe = await loadStripeJs(STRIPE_PUB_KEY);
  } catch (err) {
    console.error("Stripe initialization failed:", err);

    return {
      success: false,
      error: "Stripe failed to initialize"
    };
  }

  let resolveResult;

  const resultPromise = new Promise(resolve => {
    resolveResult = resolve;
  });

  let settled = false;

  function finish(result) {
    if (settled) {
      return;
    }

    settled = true;
    resolveResult(result);
  }

  let card = null;

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

      const cardContainer = createElement("div", {
        id: "card-element"
      });

      const messageEl = createMessageElement();

      container.append(cardContainer, messageEl);

      return container;
    },

    onOpen: async () => {
      try {
        const elements = stripe.elements();

        card = elements.create("card");

        if (
          !document.querySelector("#card-element iframe")
        ) {
          card.mount("#card-element");
        }

        const payBtn = createElement(
          "button",
          { type: "button" },
          ["Pay"]
        );

        const messageEl = document.querySelector(
          "#stripe-elements-container .payment-message"
        );

        payBtn.addEventListener("click", async () => {
          payBtn.disabled = true;

          setMessage(messageEl, "Processing…");

          try {
            const res = await stripeFetch(
              "/create-payment-intent",
              "POST",
              {
                paymentType,
                entityType,
                entityId
              }
            );

            if (!res?.clientSecret) {
              throw new Error(
                "Missing Stripe client secret"
              );
            }

            const {
              error,
              paymentIntent
            } = await stripe.confirmCardPayment(
              res.clientSecret,
              {
                payment_method: {
                  card
                }
              }
            );

            if (error) {
              throw error;
            }

            await stripeFetch(
              "/payment-success",
              "POST",
              {
                paymentType,
                entityType,
                entityId,
                paymentIntentId: paymentIntent.id
              }
            );

            setMessage(messageEl, "Payment successful");

            finish({
              success: true,
              paymentIntentId: paymentIntent.id
            });

            setTimeout(() => {
              modal.close();
            }, 300);

          } catch (err) {
            console.error(
              "Stripe payment failed:",
              err
            );

            setMessage(
              messageEl,
              err?.message || "Payment failed"
            );

            finish({
              success: false,
              error:
                err?.message || "Payment failed"
            });

          } finally {
            payBtn.disabled = false;
          }
        });

        document
          .getElementById(
            "stripe-elements-container"
          )
          .appendChild(payBtn);

      } catch (err) {
        console.error(
          "Stripe modal initialization failed:",
          err
        );

        finish({
          success: false,
          error: err?.message || "Initialization failed"
        });

        modal.close();
      }
    },

    onClose: () => {
      try {
        if (card) {
          card.destroy();
          card = null;
        }
      } catch (err) {
        console.error(
          "Stripe card cleanup failed:",
          err
        );
      }

      finish({ success: false });
    }
  });

  return resultPromise;
}

/* ───────────────────────────────────────── */
/* Wallet Payment */
/* ───────────────────────────────────────── */

async function payViaWallet({
  paymentType,
  entityType,
  entityId
}) {
  try {
    const res = await apiFetch(
      "/wallet/pay",
      "POST",
      {
        paymentType,
        entityType,
        entityId
      },
      {}
    );

    if (!res?.success) {
      return {
        success: false,
        error:
          res?.message || "Wallet payment failed"
      };
    }

    return {
      success: true
    };

  } catch (err) {
    console.error("Wallet payment error:", err);

    return {
      success: false,
      error:
        err?.message || "Wallet payment failed"
    };
  }
}

/* ───────────────────────────────────────── */
/* Cash On Delivery */
/* ───────────────────────────────────────── */

async function payCashOnDelivery({
  paymentType,
  entityType,
  entityId
}) {
  try {
    const res = await apiFetch(
      "/payments/cash-on-delivery",
      "POST",
      {
        paymentType,
        entityType,
        entityId
      },
      {}
    );

    if (!res?.success) {
      return {
        success: false,
        error:
          res?.message ||
          "Cash on delivery setup failed"
      };
    }

    return {
      success: true
    };

  } catch (err) {
    console.error(
      "Cash on delivery error:",
      err
    );

    return {
      success: false,
      error:
        err?.message ||
        "Cash on delivery failed"
    };
  }
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
  const validation = validatePaymentConfig(
    paymentType,
    entityType
  );

  if (!validation.valid) {
    console.warn(
      "Payment validation failed:",
      validation.error
    );

    return Promise.resolve({
      success: false,
      error: validation.error
    });
  }

  const rules = PAYMENT_RULES[paymentType];

  if (!rules) {
    return Promise.resolve({
      success: false,
      error: "Invalid payment type"
    });
  }

  let modalRef = null;

  const messageEl = createMessageElement();

  const paymentHandlers = {
    card: () =>
      payViaStripe({
        paymentType,
        entityType,
        entityId
      }),

    wallet: () =>
      payViaWallet({
        paymentType,
        entityType,
        entityId
      }),

    cash_on_delivery: () =>
      payCashOnDelivery({
        paymentType,
        entityType,
        entityId
      })
  };

  const confirmBtn = Button(
    "Confirm Payment",
    "",

    {
      click: async () => {
        const method = document.querySelector(
          "input[name=paymethod]:checked"
        )?.value;

        if (!method) {
          setMessage(
            messageEl,
            "Select a payment method"
          );

          return;
        }

        const handler = paymentHandlers[method];

        if (!handler) {
          setMessage(
            messageEl,
            "Unsupported payment method"
          );

          return;
        }

        confirmBtn.disabled = true;

        const originalText =
          confirmBtn.textContent;

        confirmBtn.textContent = "Processing…";

        setMessage(messageEl, "");

        try {
          const result = await handler();

          if (result?.success) {
            modalRef.close({
              success: true,
              method
            });

            return;
          }

          setMessage(
            messageEl,
            result?.error || "Payment failed"
          );

        } catch (err) {
          console.error(
            "Payment processing error:",
            err
          );

          setMessage(
            messageEl,
            err?.message ||
            "An unexpected error occurred"
          );

        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      }
    },

    "buttonx"
  );

  modalRef = Modal({
    title: `Pay for ${entityName}`,

    content: createElement("div", { class: "payoptions" }, [
      ...rules.methods.map(method =>
        createElement("label", {}, [
          createElement("input", {
            type: "radio",
            name: "paymethod",
            value: method,
            checked:
              method === rules.methods[0]
          }),

          ` ${method
            .replaceAll("_", " ")
            .toUpperCase()}`
        ])
      ),

      messageEl
    ]),

    actions: () => confirmBtn,

    returnDataOnClose: true
  });

  return modalRef.closed;
}

export {
  payViaStripe,
  showPaymentModal
};