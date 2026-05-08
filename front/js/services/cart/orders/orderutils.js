import { createElement } from "../../../components/createElement.js";

/* ───────────────── Filtering / Sorting ───────────────── */

export function normalizeOrders(orders) {
  return [...orders].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function getFilteredOrders(orders, filters) {
  const status = (filters.status || "").trim().toLowerCase();
  const date = (filters.date || "").trim();

  return orders.filter(order => {
    const orderStatus = (order.status || "").trim().toLowerCase();
    const orderDate = toLocalDateKey(order.createdAt);

    if (status && orderStatus !== status) {
      return false;
    }
    if (date && orderDate !== date) {
      return false;
    }

    return true;
  });
}

export function toLocalDateKey(dateStr) {
  if (!dateStr) {
    return "";
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toggleExpanded(state, orderId) {
  if (state.expandedOrders.has(orderId)) {
    state.expandedOrders.delete(orderId);
  } else {
    state.expandedOrders.add(orderId);
  }
}

export function getOrderProducts(order) {
  return Array.isArray(order?.items?.products) ? order.items.products : [];
}


export function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function formatDate(dateStr) {
  if (!dateStr) {
    return "N/A";
  }

  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

export function formatINR(val = 0) {
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);
}

/* ───────────────── Actions ───────────────── */

export function downloadReceipt(order) {
  const blob = new Blob([JSON.stringify(order, null, 2)], {
    type: "application/json",
  });

  const link = createElement("a", {
    href: URL.createObjectURL(blob),
    download: `receipt_${order.orderId || "order"}.json`,
  });

  document.body.append(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}