import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";

export function renderFiltersSection(onApplyFilters) {
  const cropTypeSelect = createElement(
    "select",
    { id: "filter-crop-type" },
    [
      { value: "", label: "All" },
      { value: "wheat", label: "Wheat" },
      { value: "tomatoes", label: "Tomatoes" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  );

  const deliveryStatusSelect = createElement(
    "select",
    { id: "filter-delivery-status" },
    [
      { value: "", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  );

  const paymentStatusSelect = createElement(
    "select",
    { id: "filter-payment-status" },
    [
      { value: "", label: "All" },
      { value: "paid", label: "Paid" },
      { value: "pending", label: "Pending" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  );

  const dateInput = createElement("input", {
    type: "date",
    id: "filter-date",
  });

  const applyButton = Button("Apply Filters", "apply-filters-btn", {
    click: () => {
      const filters = {
        cropType: cropTypeSelect.value,
        deliveryStatus: deliveryStatusSelect.value,
        paymentStatus: paymentStatusSelect.value,
        date: dateInput.value,
      };
      onApplyFilters(filters);
    },
  }, "primary-button");

  return createElement("div", { class: "filters-section" }, [
    createElement("label", {}, ["Crop Type:", cropTypeSelect]),
    createElement("label", {}, ["Delivery Status:", deliveryStatusSelect]),
    createElement("label", {}, ["Payment Status:", paymentStatusSelect]),
    createElement("label", {}, ["Date:", dateInput]),
    applyButton,
  ]);
}
