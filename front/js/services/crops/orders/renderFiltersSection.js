import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";

export function renderFiltersSection(onApplyFilters) {
  const cropTypeInput = createElement("input", {
    type: "text",
    id: "filter-crop-type",
    placeholder: "Crop name",
  });

  const orderStatusSelect = createElement(
    "select",
    { id: "filter-order-status" },
    [
      { value: "", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "accepted", label: "Accepted" },
      { value: "paid", label: "Paid" },
      { value: "delivered", label: "Delivered" },
      { value: "rejected", label: "Rejected" },
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
      { value: "unpaid", label: "Unpaid" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  );

  const dateInput = createElement("input", {
    type: "date",
    id: "filter-date",
  });

  const applyButton = Button(
    "Apply Filters",
    "apply-filters-btn",
    {
      click: () => {
        const filters = {
          crop: cropTypeInput.value.trim(),
          status: orderStatusSelect.value,
          payment: paymentStatusSelect.value,
          date: dateInput.value,
        };

        onApplyFilters(filters);
      },
    },
    "primary-button"
  );

  return createElement("div", { class: "filters-section" }, [
    createElement("label", {}, ["Crop:", cropTypeInput]),
    createElement("label", {}, ["Order Status:", orderStatusSelect]),
    createElement("label", {}, ["Payment Status:", paymentStatusSelect]),
    createElement("label", {}, ["Date:", dateInput]),
    applyButton,
  ]);
}