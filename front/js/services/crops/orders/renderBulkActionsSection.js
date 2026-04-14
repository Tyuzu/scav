import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";

export function renderBulkActionsSection(onAccept, onReject, onMarkDelivered) {
  const acceptBtn = Button("Accept Selected", "bulk-accept-btn", {
    click: onAccept,
  }, "success-button");

  const rejectBtn = Button("Reject Selected", "bulk-reject-btn", {
    click: onReject,
  }, "danger-button");

  const deliveredBtn = Button("Mark as Delivered", "bulk-delivered-btn", {
    click: onMarkDelivered,
  }, "secondary-button");

  return createElement("div", { class: "bulk-actions-section" }, [
    acceptBtn,
    rejectBtn,
    deliveredBtn,
  ]);
}
