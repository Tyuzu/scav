import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";
import {
  capitalize,
  contactBuyer,
  formatOrderDate,
  getOrderStatusClass,
  getPaymentStatusClass,
  normalizeOrderId,
} from "./orderHelpers.js";
import {
  markOrderDelivered,
  markOrderPaid,
  rejectOrder,
  acceptOrder,
} from "./orderUtils.js";

function canAccept(status) {
  return String(status || "").toLowerCase() === "pending";
}

function canMarkPaid(status) {
  return String(status || "").toLowerCase() === "accepted";
}

function canDeliver(status) {
  return String(status || "").toLowerCase() === "paid";
}

function canReject(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "pending" || normalized === "accepted";
}

export function renderOrderCard(order, onRefresh) {
  const orderId = normalizeOrderId(order);
  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);

  const handleContact = () => {
    contactBuyer(order.contact);
  };

  const handleAccepted = async () => {
    const success = await acceptOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleMarkedPaid = async () => {
    const success = await markOrderPaid(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleDelivered = async () => {
    const success = await markOrderDelivered(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleReject = async () => {
    const success = await rejectOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  return createElement("div", { class: "order-card" }, [
    createElement("div", { class: "order-header" }, [
      createElement("h3", {}, [`Order #${orderId}`]),
      createElement("span", { class: `status-badge ${statusClass}` }, [
        capitalize(order.status),
      ]),
    ]),

    createElement("div", { class: "order-info" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Buyer:"]),
        ` ${order.buyer || "-"}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Contact:"]),
        ` ${order.contact || "-"}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Crop:"]),
        ` ${order.crop || "-"}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Quantity:"]),
        ` ${order.qty ?? "-"} ${order.unit || ""}`.trim(),
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Order Date:"]),
        ` ${formatOrderDate(order.orderDate)}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Delivery Date:"]),
        ` ${formatOrderDate(order.deliveryDate)}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Address:"]),
        ` ${order.address || "-"}`,
      ]),
      createElement("p", { class: `payment-status ${paymentClass}` }, [
        createElement("strong", {}, ["Payment:"]),
        ` ${capitalize(order.payment)}`,
      ]),
    ]),

    createElement("div", { class: "order-actions" }, [
      Button("Contact", `contact-${orderId}`, { click: handleContact }, "secondary-button"),

      canAccept(order.status)
        ? Button("Accept", `accept-${orderId}`, { click: handleAccepted }, "success-button")
        : null,

      canMarkPaid(order.status)
        ? Button("Mark Paid", `markpaid-${orderId}`, { click: handleMarkedPaid }, "primary-button")
        : null,

      canDeliver(order.status)
        ? Button("Delivered", `deliver-${orderId}`, { click: handleDelivered }, "success-button")
        : null,

      canReject(order.status)
        ? Button("Reject", `reject-${orderId}`, { click: handleReject }, "danger-button")
        : null,
    ].filter(Boolean)),
  ]);
}