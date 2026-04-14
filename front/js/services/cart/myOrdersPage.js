import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";

const PAGE_SIZE = 5;

export async function displayMyOrders(container, isLoggedIn) {
  container.replaceChildren();

  if (!isLoggedIn) {
    container.append(
      createElement("p", {}, ["You must be logged in to view your orders."])
    );
    return;
  }

  const state = {
    orders: [],
    filters: {
      status: "",
      date: "",
    },
    currentPage: 1,
    expandedOrders: new Set(),
  };

  const render = () => {
    container.replaceChildren(buildOrdersPage(state, render));
  };

  render();

  try {
    const res = await apiFetch("/order/mine", "GET");

    if (!res || !Array.isArray(res.orders)) {
      throw new Error("Invalid orders response");
    }

    state.orders = normalizeOrders(res.orders);
    state.currentPage = 1;
    render();
  } catch (err) {
    console.error("Failed to fetch user orders:", err);
    container.replaceChildren(
      createElement("section", { class: "user-orders-page" }, [
        createElement("h2", {}, ["My Orders"]),
        createElement("p", {}, ["Failed to load orders. Please try again later."]),
      ])
    );
  }
}

/* ───────────────── Page ───────────────── */

function buildOrdersPage(state, rerender) {
  const filteredOrders = getFilteredOrders(state.orders, state.filters);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }

  const pagedOrders = filteredOrders.slice(
    (state.currentPage - 1) * PAGE_SIZE,
    state.currentPage * PAGE_SIZE
  );

  const isMobile = window.innerWidth <= 768;

  const sectionChildren = [
    createElement("h2", {}, ["My Orders"]),
    buildUserOrderFilters(state, rerender),
    buildOrdersSummary(filteredOrders.length, state.orders.length, state.currentPage, totalPages),
  ];

  if (isMobile) {
    sectionChildren.push(buildMobileOrdersList(pagedOrders, state, rerender));
  } else {
    sectionChildren.push(buildDesktopOrdersTable(pagedOrders, state, rerender));
  }

  sectionChildren.push(buildPaginationControls(state, filteredOrders.length, totalPages, rerender));

  return createElement("section", { class: "user-orders-page" }, sectionChildren);
}

/* ───────────────── Filters ───────────────── */

function buildUserOrderFilters(state, rerender) {
  return createElement("div", { class: "filters" }, [
    buildLabeledSelect(
      "Status",
      [
        { value: "", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "shipped", label: "Shipped" },
        { value: "delivered", label: "Delivered" },
      ],
      state.filters.status,
      value => {
        state.filters.status = value;
        state.currentPage = 1;
        rerender();
      }
    ),
    createElement("label", {}, [
      "Date:",
      createElement("input", {
        type: "date",
        value: state.filters.date,
        onchange: e => {
          state.filters.date = e.target.value;
          state.currentPage = 1;
          rerender();
        },
      }),
    ]),
    createElement(
      "button",
      {
        type: "button",
        onclick: () => {
          state.currentPage = 1;
          rerender();
        },
      },
      ["Filter"]
    ),
    createElement(
      "button",
      {
        type: "button",
        onclick: () => {
          state.filters.status = "";
          state.filters.date = "";
          state.currentPage = 1;
          rerender();
        },
      },
      ["Reset"]
    ),
  ]);
}

function buildOrdersSummary(filteredCount, totalCount, currentPage, totalPages) {
  return createElement("p", { class: "orders-summary" }, [
    `Showing ${filteredCount} of ${totalCount} order(s) · Page ${currentPage} of ${totalPages}`,
  ]);
}

/* ───────────────── Filtering / Sorting ───────────────── */

function normalizeOrders(orders) {
  return [...orders].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function getFilteredOrders(orders, filters) {
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

function toLocalDateKey(dateStr) {
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

/* ───────────────── Desktop Table ───────────────── */

function buildDesktopOrdersTable(orders, state, rerender) {
  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [
      createElement("tr", {}, [
        ["", "Order ID", "Date", "Total", "Status", "Actions"].map(h =>
          createElement("th", {}, [h])
        ),
      ]),
    ]),
    createElement(
      "tbody",
      {},
      orders.length
        ? orders.flatMap(order => buildExpandableOrderRows(order, state, rerender))
        : [
          createElement("tr", {}, [
            createElement("td", { colspan: 6 }, ["No orders found."]),
          ]),
        ]
    ),
  ]);
}

function buildExpandableOrderRows(order, state, rerender) {
  const expanded = state.expandedOrders.has(order.orderId);
  const products = getOrderProducts(order);

  const summaryRow = createElement("tr", { class: "order-summary-row" }, [
    createElement("td", {}, [
      createElement(
        "button",
        {
          type: "button",
          onclick: () => {
            toggleExpanded(state, order.orderId);
            rerender();
          },
        },
        [expanded ? "−" : "+"]
      ),
    ]),
    createElement("td", {}, [order.orderId || "N/A"]),
    createElement("td", {}, [formatDate(order.createdAt)]),
    createElement("td", {}, [formatINR(order.total || 0)]),
    createElement("td", {}, [capitalize(order.status)]),
    createElement("td", {}, [
      createElement(
        "button",
        {
          type: "button",
          onclick: () => downloadReceipt(order),
        },
        ["Receipt"]
      ),
    ]),
  ]);

  const detailRow = createElement("tr", { class: "order-detail-row" }, [
    createElement("td", { colspan: 6 }, [
      expanded
        ? buildOrderItemsTable(products)
        : createElement("div", {}, []),
    ]),
  ]);

  return [summaryRow, detailRow];
}

function buildOrderItemsTable(products) {
  return createElement("table", { class: "order-items-table" }, [
    createElement("thead", {}, [
      createElement("tr", {}, [
        ["Farm", "Item", "Qty", "Item Price"].map(h =>
          createElement("th", {}, [h])
        ),
      ]),
    ]),
    createElement(
      "tbody",
      {},
      products.length
        ? products.map(item =>
          createElement("tr", {}, [
            createElement("td", {}, [item.entityName || "Unknown"]),
            createElement("td", {}, [item.itemName || "N/A"]),
            createElement("td", {}, [String(item.quantity || 0)]),
            createElement("td", {}, [formatINR(item.price || 0)]),
          ])
        )
        : [
          createElement("tr", {}, [
            createElement("td", { colspan: 4 }, ["No items found."]),
          ]),
        ]
    ),
  ]);
}

/* ───────────────── Mobile Cards ───────────────── */

function buildMobileOrdersList(orders, state, rerender) {
  return createElement(
    "div",
    { class: "orders-cards" },
    orders.length
      ? orders.map(order => buildExpandableOrderCard(order, state, rerender))
      : [createElement("p", {}, ["No orders found."])]
  );
}

function buildExpandableOrderCard(order, state, rerender) {
  const expanded = state.expandedOrders.has(order.orderId);
  const products = getOrderProducts(order);

  return createElement("div", { class: "order-card" }, [
    createElement("div", { class: "order-card-header" }, [
      createElement("p", {}, [`Order ID: ${order.orderId || "N/A"}`]),
      createElement(
        "button",
        {
          type: "button",
          onclick: () => {
            toggleExpanded(state, order.orderId);
            rerender();
          },
        },
        [expanded ? "Collapse" : "Expand"]
      ),
    ]),
    createElement("p", {}, [`Date: ${formatDate(order.createdAt)}`]),
    createElement("p", {}, [`Status: ${capitalize(order.status)}`]),
    createElement("p", {}, [`Total: ${formatINR(order.total || 0)}`]),
    expanded
      ? createElement(
        "div",
        { class: "order-card-items" },
        products.length
          ? products.map(item =>
            createElement("div", { class: "order-card-item" }, [
              createElement("p", {}, [`Farm: ${item.entityName || "Unknown"}`]),
              createElement("p", {}, [`Item: ${item.itemName || "N/A"}`]),
              createElement("p", {}, [`Qty: ${item.quantity || 0}`]),
              createElement("p", {}, [`Item Price: ${formatINR(item.price || 0)}`]),
            ])
          )
          : [createElement("p", {}, ["No items found."])]
      )
      : createElement("div", {}, []),
    createElement(
      "button",
      {
        type: "button",
        onclick: () => downloadReceipt(order),
      },
      ["Receipt"]
    ),
  ]);
}

function toggleExpanded(state, orderId) {
  if (state.expandedOrders.has(orderId)) {
    state.expandedOrders.delete(orderId);
  } else {
    state.expandedOrders.add(orderId);
  }
}

function getOrderProducts(order) {
  return Array.isArray(order?.items?.products) ? order.items.products : [];
}

/* ───────────────── Pagination ───────────────── */

function buildPaginationControls(state, totalOrders, totalPages, rerender) {
  return createElement("div", { class: "pagination" }, [
    createElement(
      "button",
      {
        type: "button",
        disabled: state.currentPage <= 1,
        onclick: () => {
          if (state.currentPage > 1) {
            state.currentPage -= 1;
            rerender();
          }
        },
      },
      ["Prev"]
    ),
    createElement("span", {}, [
      `Page ${state.currentPage} of ${totalPages} · ${totalOrders} order(s)`,
    ]),
    createElement(
      "button",
      {
        type: "button",
        disabled: state.currentPage >= totalPages,
        onclick: () => {
          if (state.currentPage < totalPages) {
            state.currentPage += 1;
            rerender();
          }
        },
      },
      ["Next"]
    ),
  ]);
}

/* ───────────────── Utilities ───────────────── */

function buildLabeledSelect(labelText, options, value, onChange) {
  return createElement("label", {}, [
    `${labelText}:`,
    createElement(
      "select",
      {
        value,
        onchange: e => onChange(e.target.value),
      },
      options.map(o =>
        createElement("option", { value: o.value }, [o.label])
      )
    ),
  ]);
}

function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function formatDate(dateStr) {
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

function formatINR(val = 0) {
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);
}

/* ───────────────── Actions ───────────────── */

function downloadReceipt(order) {
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