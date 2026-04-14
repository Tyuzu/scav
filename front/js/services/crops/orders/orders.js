import { createElement } from "../../../components/createElement";
import { fetchIncomingOrders } from "./orderUtils.js";
import { renderFiltersSection } from "./renderFiltersSection.js";
import { renderBulkActionsSection } from "./renderBulkActionsSection.js";
import { renderOrderCard } from "./renderOrderCard.js";
import { renderOrdersTable } from "./renderOrdersTable.js";

export async function displayOrders(container) {
  container.replaceChildren();

  const section = createElement("section", { class: "orders-page" }, [
    createElement("h2", {}, ["Incoming Orders"]),
  ]);

  container.appendChild(section);

  const refresh = () => displayOrders(container);

  try {
    const orders = await fetchIncomingOrders();

    // Render filters section
    const filtersSection = renderFiltersSection((filters) => {
      // TODO: Apply filters to orders
      console.log("Applying filters:", filters);
    });
    section.appendChild(filtersSection);

    // Render bulk actions section
    const bulkActionsSection = renderBulkActionsSection(
      () => handleBulkAccept(section),
      () => handleBulkReject(section),
      () => handleBulkMarkDelivered(section)
    );
    section.appendChild(bulkActionsSection);

    // Render responsive layout (table or cards)
    const layout = buildResponsiveOrdersLayout(orders, refresh);
    section.appendChild(layout);
  } catch (err) {
    console.error("Failed to fetch incoming orders:", err);
    section.appendChild(
      createElement("p", { class: "error-msg" }, ["Failed to load orders. Please try again later."])
    );
  }
}

// Decide whether to build table or card view
function buildResponsiveOrdersLayout(orderList, refresh) {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return createElement("div", { class: "orders-cards" }, 
      orderList.length === 0
        ? [createElement("p", {}, ["No orders found."])]
        : orderList.map((order) => renderOrderCard(order, refresh))
    );
  }

  return renderOrdersTable(orderList, refresh);
}

// Handle bulk actions
function handleBulkAccept(section) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  console.log("Accepting orders:", selectedOrders);
  // TODO: Implement bulk accept API call
}

function handleBulkReject(section) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  console.log("Rejecting orders:", selectedOrders);
  // TODO: Implement bulk reject API call
}

function handleBulkMarkDelivered(section) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  console.log("Marking delivered:", selectedOrders);
  // TODO: Implement bulk mark delivered API call
}
