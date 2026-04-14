import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";
import { capitalize, contactBuyer, getOrderStatusClass, getPaymentStatusClass } from "./orderHelpers.js";
import { markOrderDelivered, rejectOrder } from "./orderUtils.js";

export function renderOrderCard(order, onRefresh) {
  const handleContact = () => contactBuyer(order.contact);

  const handleDelivered = async () => {
    const success = await markOrderDelivered(order.id);
    if (success) {
      onRefresh?.();
    }
  };

  const handleReject = async () => {
    const success = await rejectOrder(order.id);
    if (success) {
      onRefresh?.();
    }
  };

  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);

  return createElement("div", { class: "order-card" }, [
    createElement("div", { class: "order-header" }, [
      createElement("h3", {}, [`Order #${order.id}`]),
      createElement("span", { class: `status-badge ${statusClass}` }, [capitalize(order.status)]),
    ]),
    createElement("div", { class: "order-info" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Buyer:"]),
        ` ${order.buyer}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Contact:"]),
        ` ${order.contact}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Crop:"]),
        ` ${order.crop}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Quantity:"]),
        ` ${order.qty} ${order.unit}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Order Date:"]),
        ` ${order.orderDate}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Delivery Date:"]),
        ` ${order.deliveryDate}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Address:"]),
        ` ${order.address}`,
      ]),
      createElement("p", { class: `payment-status ${paymentClass}` }, [
        createElement("strong", {}, ["Payment:"]),
        ` ${capitalize(order.payment)}`,
      ]),
    ]),
    createElement("div", { class: "order-actions" }, [
      Button("Contact", `contact-${order.id}`, { click: handleContact }, "secondary-button"),
      Button("Delivered", `deliver-${order.id}`, { click: handleDelivered }, "success-button"),
      Button("Reject", `reject-${order.id}`, { click: handleReject }, "danger-button"),
    ]),
  ]);
}
