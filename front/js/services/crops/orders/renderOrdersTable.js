import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";
import { capitalize, contactBuyer, getOrderStatusClass, getPaymentStatusClass } from "./orderHelpers.js";
import { markOrderDelivered, rejectOrder } from "./orderUtils.js";

export function renderOrdersTable(orderList, onRefresh) {
  const handleContact = (contact) => contactBuyer(contact);

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
    ...["Order ID", "Buyer", "Contact", "Crop", "Qty", "Order Date", "Delivery Date", "Address", "Payment", "Status", "Actions"].map(
      (header) => createElement("th", {}, [header])
    ),
  ]);

  const bodyRows = orderList.length === 0
    ? [
        createElement("tr", {}, [
          createElement("td", { colspan: 12 }, ["No orders found."]),
        ]),
      ]
    : orderList.map((order) => buildOrderTableRow(order, handleContact, handleDelivered, handleReject));

  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [headerRow]),
    createElement("tbody", {}, bodyRows),
  ]);
}

function buildOrderTableRow(order, onContact, onDelivered, onReject) {
  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);

  return createElement("tr", {}, [
    createElement("td", {}, [
      createElement("input", { type: "checkbox", class: "select-order", value: order.id }),
    ]),
    createElement("td", {}, [order.id]),
    createElement("td", {}, [order.buyer]),
    createElement("td", {}, [order.contact]),
    createElement("td", {}, [order.crop]),
    createElement("td", {}, [`${order.qty} ${order.unit}`]),
    createElement("td", {}, [order.orderDate]),
    createElement("td", {}, [order.deliveryDate]),
    createElement("td", {}, [order.address]),
    createElement("td", { class: `payment-status ${paymentClass}` }, [capitalize(order.payment)]),
    createElement("td", { class: `order-status ${statusClass}` }, [capitalize(order.status)]),
    createElement("td", { class: "action-buttons" }, [
      Button("Contact", `contact-${order.id}`, {
        click: (e) => {
          e.stopPropagation();
          onContact(order.contact);
        },
      }, "small-button"),
      Button("Delivered", `deliver-${order.id}`, {
        click: (e) => {
          e.stopPropagation();
          onDelivered(order.id);
        },
      }, "small-button"),
      Button("Reject", `reject-${order.id}`, {
        click: (e) => {
          e.stopPropagation();
          onReject(order.id);
        },
      }, "small-button"),
    ]),
  ]);
}
