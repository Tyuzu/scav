export function capitalize(str) {
  return typeof str === "string"
    ? str.charAt(0).toUpperCase() + str.slice(1)
    : "";
}

export function contactBuyer(email) {
  window.location.href = `mailto:${email}`;
}

export function formatOrderDate(date) {
  return new Date(date).toLocaleDateString();
}

export function getOrderStatusClass(status) {
  const statusMap = {
    pending: "status-pending",
    shipped: "status-shipped",
    delivered: "status-delivered",
    rejected: "status-rejected",
  };
  return statusMap[status?.toLowerCase()] || "status-unknown";
}

export function getPaymentStatusClass(payment) {
  const paymentMap = {
    paid: "payment-paid",
    pending: "payment-pending",
  };
  return paymentMap[payment?.toLowerCase()] || "payment-unknown";
}
