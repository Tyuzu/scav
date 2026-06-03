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

export function renderOrdersTable(orderList, onRefresh) {
  const handleContact = (contact) => contactBuyer(contact);

  const handleAccepted = async (orderId) => {
    const success = await acceptOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleMarkedPaid = async (orderId) => {
    const success = await markOrderPaid(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleDelivered = async (orderId) => {
    const success = await markOrderDelivered(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleReject = async (orderId) => {
    const success = await rejectOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const headerRow = createElement("tr", {}, [
    createElement("th", {}, [
      createElement("input", { type: "checkbox", id: "select-all-orders" }),
    ]),
    ...[
      "Order ID",
      "Buyer",
      "Contact",
      "Crop",
      "Qty",
      "Order Date",
      "Delivery Date",
      "Address",
      "Payment",
      "Status",
      "Actions",
    ].map((header) => createElement("th", {}, [header])),
  ]);

  const bodyRows =
    orderList.length === 0
      ? [
          createElement("tr", {}, [
            createElement("td", { colspan: 12 }, ["No orders found."]),
          ]),
        ]
      : orderList.map((order) =>
          buildOrderTableRow(order, handleContact, handleAccepted, handleMarkedPaid, handleDelivered, handleReject)
        );

  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [headerRow]),
    createElement("tbody", {}, bodyRows),
  ]);
}

function buildOrderTableRow(order, onContact, onAccepted, onMarkedPaid, onDelivered, onReject) {
  const orderId = normalizeOrderId(order);
  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);

  return createElement("tr", {}, [
    createElement("td", {}, [
      createElement("input", { type: "checkbox", class: "select-order", value: orderId }),
    ]),
    createElement("td", {}, [orderId]),
    createElement("td", {}, [order.buyer || "-"]),
    createElement("td", {}, [order.contact || "-"]),
    createElement("td", {}, [order.crop || "-"]),
    createElement("td", {}, [`${order.qty ?? "-"} ${order.unit || ""}`.trim()]),
    createElement("td", {}, [formatOrderDate(order.orderDate)]),
    createElement("td", {}, [formatOrderDate(order.deliveryDate)]),
    createElement("td", {}, [order.address || "-"]),
    createElement("td", { class: `payment-status ${paymentClass}` }, [
      capitalize(order.payment),
    ]),
    createElement("td", { class: `order-status ${statusClass}` }, [
      capitalize(order.status),
    ]),
    createElement("td", { class: "action-buttons" }, [
      Button("Contact", `contact-${orderId}`, {
        click: (e) => {
          e.stopPropagation();
          onContact(order.contact);
        },
      }, "small-button buttonx"),

      canAccept(order.status)
        ? Button("Accept", `accept-${orderId}`, {
            click: (e) => {
              e.stopPropagation();
              onAccepted(orderId);
            },
          }, "small-button buttonx")
        : null,

      canMarkPaid(order.status)
        ? Button("Mark Paid", `markpaid-${orderId}`, {
            click: (e) => {
              e.stopPropagation();
              onMarkedPaid(orderId);
            },
          }, "small-button buttonx")
        : null,

      canDeliver(order.status)
        ? Button("Delivered", `deliver-${orderId}`, {
            click: (e) => {
              e.stopPropagation();
              onDelivered(orderId);
            },
          }, "small-button buttonx")
        : null,

      canReject(order.status)
        ? Button("Reject", `reject-${orderId}`, {
            click: (e) => {
              e.stopPropagation();
              onReject(orderId);
            },
          }, "small-button buttonx")
        : null,
    ].filter(Boolean)),
  ]);
}