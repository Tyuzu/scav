import { createElement } from "../../../components/createElement.js";

/* ───────────────── Filtering / Sorting ───────────────── */

export function normalizeOrders(orders) {
  return [...orders].sort((a, b) => {
    // Handle both createdAt and created_at field names
    const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
    const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
    return bTime - aTime;
  }).map(order => ({
    ...order,
    // Normalize field names: use orderId, createdAt internally
    orderId: order.orderId || order.orderid,
    createdAt: order.createdAt || order.created_at,
    // Ensure total is in rupees (backend stores in paise for some types)
    total: typeof order.total === 'string' ? parseInt(order.total) : (order.total || 0)
  }));
}

export function getFilteredOrders(orders, filters) {
  const status = (filters.status || "").trim().toLowerCase();
  const date = (filters.date || "").trim();

  return orders.filter(order => {
    const orderStatus = (order.status || "").trim().toLowerCase();
    const orderDate = toLocalDateKey(order.createdAt || order.created_at);

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
  // Handle both structures: items.products array or items as a map of categories
  if (Array.isArray(order?.items?.products)) {
    return order.items.products;
  }
  
  // If items is a map (like from backend with crops, products, etc categories)
  if (order?.items && typeof order.items === 'object' && !Array.isArray(order.items)) {
    const allItems = [];
    for (const category in order.items) {
      const categoryItems = order.items[category];
      if (Array.isArray(categoryItems)) {
        allItems.push(...categoryItems);
      }
    }
    return allItems;
  }
  
  return [];
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

export function formatINR(val = 0, isPaise = false) {
  // If value is in paise (backend storage format), convert to rupees
  const rupees = isPaise ? val / 100 : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
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