export function normalizeOrderId(order) {
  return order?.id ?? order?.orderid ?? order?.orderId ?? "";
}

export function capitalize(str) {
  if (typeof str !== "string" || str.length === 0) {
    return "";
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function contactBuyer(contact) {
  if (!contact) {
    return;
  }

  window.location.href = `mailto:${contact}`;
}

export function formatOrderDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

export function getOrderStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  const statusMap = {
    pending: "status-pending",
    accepted: "status-accepted",
    paid: "status-paid",
    delivered: "status-delivered",
    rejected: "status-rejected",
  };

  return statusMap[normalized] || "status-unknown";
}

export function getPaymentStatusClass(payment) {
  const normalized = String(payment || "").toLowerCase();

  const paymentMap = {
    paid: "payment-paid",
    pending: "payment-pending",
    unpaid: "payment-unpaid",
    failed: "payment-failed",
  };

  return paymentMap[normalized] || "payment-unknown";
}