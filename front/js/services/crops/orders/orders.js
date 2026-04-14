import { createElement } from "../../../components/createElement";
import { fetchIncomingOrders, bulkAcceptOrders, bulkRejectOrders, bulkMarkOrdersDelivered } from "./orderUtils.js";
import { renderFiltersSection } from "./renderFiltersSection.js";
import { renderBulkActionsSection } from "./renderBulkActionsSection.js";
import { renderOrderCard } from "./renderOrderCard.js";
import { renderOrdersTable } from "./renderOrdersTable.js";

// Store current filters state
let currentFilters = {};
let allOrders = [];

export async function displayOrders(container) {
  container.replaceChildren();

  const section = createElement("section", { class: "orders-page" }, [
    createElement("h2", {}, ["Incoming Orders"]),
  ]);

  container.appendChild(section);

  const refresh = () => displayOrders(container);

  try {
    allOrders = await fetchIncomingOrders(currentFilters);

    // Render filters section
    const filtersSection = renderFiltersSection((filters) => {
      currentFilters = filters;
      displayOrders(container);
    });
    section.appendChild(filtersSection);

    // Render bulk actions section
    const bulkActionsSection = renderBulkActionsSection(
      () => handleBulkAccept(section, refresh),
      () => handleBulkReject(section, refresh),
      () => handleBulkMarkDelivered(section, refresh)
    );
    section.appendChild(bulkActionsSection);

    // Render responsive layout (table or cards)
    const layout = buildResponsiveOrdersLayout(allOrders, refresh);
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
async function handleBulkAccept(section, refresh) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  
  if (selectedOrders.length === 0) {
    alert("Please select at least one order");
    return;
  }

  try {
    const result = await bulkAcceptOrders(selectedOrders);
    if (result.success) {
      alert(`Successfully accepted ${result.updated} order(s)`);
      refresh();
    } else {
      alert(`Failed to accept orders: ${result.message}`);
      if (result.errors.length > 0) {
        console.error("Bulk accept errors:", result.errors);
      }
    }
  } catch (err) {
    console.error("Error accepting orders:", err);
    alert("An error occurred while accepting orders");
  }
}

async function handleBulkReject(section, refresh) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  
  if (selectedOrders.length === 0) {
    alert("Please select at least one order");
    return;
  }

  try {
    const result = await bulkRejectOrders(selectedOrders);
    if (result.success) {
      alert(`Successfully rejected ${result.updated} order(s)`);
      refresh();
    } else {
      alert(`Failed to reject orders: ${result.message}`);
      if (result.errors.length > 0) {
        console.error("Bulk reject errors:", result.errors);
      }
    }
  } catch (err) {
    console.error("Error rejecting orders:", err);
    alert("An error occurred while rejecting orders");
  }
}

async function handleBulkMarkDelivered(section, refresh) {
  const checkboxes = section.querySelectorAll(".select-order:checked");
  const selectedOrders = Array.from(checkboxes).map((cb) => cb.value);
  
  if (selectedOrders.length === 0) {
    alert("Please select at least one order");
    return;
  }

  try {
    const result = await bulkMarkOrdersDelivered(selectedOrders);
    if (result.success) {
      alert(`Successfully marked ${result.updated} order(s) as delivered`);
      refresh();
    } else {
      alert(`Failed to mark orders as delivered: ${result.message}`);
      if (result.errors.length > 0) {
        console.error("Bulk mark delivered errors:", result.errors);
      }
    }
  } catch (err) {
    console.error("Error marking orders as delivered:", err);
    alert("An error occurred while marking orders as delivered");
  }
}
