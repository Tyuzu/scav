import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";

export async function displayMyOrders(container, isLoggedIn) {
  container.replaceChildren();

  if (!isLoggedIn) {
    container.append(
      createElement("p", {}, ["You must be logged in to view your orders."])
    );
    return;
  }

  const section = createElement("section", { class: "user-orders-page" }, [
    createElement("h2", {}, ["My Orders"]),
    buildUserOrderFilters(),
  ]);

  container.append(section);

  try {
    const res = await apiFetch("/orders/mine", "GET");

    if (!res || !Array.isArray(res.orders)) {
      throw new Error("Invalid orders response");
    }

    section.append(buildResponsiveOrdersLayout(res.orders));
  } catch (err) {
    console.error("Failed to fetch user orders:", err);
    section.append(
      createElement("p", {}, ["Failed to load orders. Please try again later."])
    );
  }
}

/* ───────────────── Filters ───────────────── */
function buildUserOrderFilters() {
  return createElement("div", { class: "filters" }, [
    buildLabeledSelect("Status", [
      { value: "", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "confirmed", label: "Confirmed" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
    ]),
    createElement("label", {}, [
      "Date:",
      createElement("input", { type: "date" }),
    ]),
    createElement("button", { type: "button" }, ["Filter"]),
  ]);
}

/* ───────────────── Layout Switch ───────────────── */
function buildResponsiveOrdersLayout(orders) {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return createElement(
      "div",
      { class: "orders-cards" },
      orders.length
        ? orders.map(buildOrderCard)
        : [createElement("p", {}, ["No orders found."])]
    );
  }

  return buildUserOrdersTable(orders);
}

/* ───────────────── Desktop Table ───────────────── */
function buildUserOrdersTable(orders) {
  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [
      createElement("tr", {}, [
        "Order ID",
        "Farm",
        "Item",
        "Qty",
        "Date",
        "Price",
        "Status",
        "Actions",
      ].map(h => createElement("th", {}, [h]))),
    ]),
    createElement(
      "tbody",
      {},
      orders.length
        ? orders.map(buildUserOrderRow)
        : [
            createElement("tr", {}, [
              createElement("td", { colspan: 8 }, ["No orders found."]),
            ]),
          ]
    ),
  ]);
}

function buildUserOrderRow(order) {
  const item = order.items?.crops?.[0] || {};
  const qty = item.quantity || 0;
  const unit = item.unit || "";
  const price = order.total || item.price || 0;

  return createElement("tr", {}, [
    createElement("td", {}, [order.orderid]),
    createElement("td", {}, [item.entityName || "Unknown"]),
    createElement("td", {}, [item.itemName || "N/A"]),
    createElement("td", {}, [`${qty} ${unit}`]),
    createElement("td", {}, [formatDate(order.createdAt)]),
    createElement("td", {}, [formatINR(price)]),
    createElement("td", {}, [capitalize(order.status)]),
    createElement("td", {}, [
      createElement("button", {
        onclick: () => downloadReceipt(order),
      }, ["Receipt"]),
    ]),
  ]);
}

/* ───────────────── Mobile Cards ───────────────── */
function buildOrderCard(order) {
  const item = order.items?.crops?.[0] || {};
  const qty = item.quantity || 0;
  const unit = item.unit || "";
  const price = order.total || item.price || 0;

  return createElement("div", { class: "order-card" }, [
    createElement("p", {}, [`Order ID: ${order.orderid}`]),
    createElement("p", {}, [`Farm: ${item.entityName || "Unknown"}`]),
    createElement("p", {}, [`Item: ${item.itemName || "N/A"}`]),
    createElement("p", {}, [`Qty: ${qty} ${unit}`]),
    createElement("p", {}, [`Date: ${formatDate(order.createdAt)}`]),
    createElement("p", {}, [`Total: ${formatINR(price)}`]),
    createElement("p", {}, [`Status: ${capitalize(order.status)}`]),
    createElement("button", {
      onclick: () => downloadReceipt(order),
    }, ["Receipt"]),
  ]);
}

/* ───────────────── Utilities ───────────────── */
function buildLabeledSelect(labelText, options) {
  return createElement("label", {}, [
    `${labelText}:`,
    createElement(
      "select",
      {},
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
  return isNaN(d)
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
    download: `receipt_${order.orderid}.json`,
  });

  document.body.append(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

// import { createElement } from "../../components/createElement";
// import { apiFetch } from "../../api/api";

// export async function displayMyOrders(container, isLoggedIn) {
//   container.replaceChildren();

//   if (!isLoggedIn) {
//     container.appendChild(
//       createElement("p", {}, ["You must be logged in to view your orders."])
//     );
//     return;
//   }

//   const section = createElement("section", { class: "user-orders-page" }, [
//     createElement("h2", {}, ["My Orders"]),
//     buildUserOrderFilters(),
//   ]);

//   container.appendChild(section);

//   try {
//     const response = await apiFetch("/orders/mine");

//     if (!response.success || !Array.isArray(response.orders)) {
//       throw new Error("Invalid response");
//     }

//     const layout = buildResponsiveOrdersLayout(response.orders);
//     section.appendChild(layout);
//   } catch (err) {
//     console.error("Failed to fetch user orders:", err);
//     section.appendChild(
//       createElement("p", {}, ["Failed to load orders. Please try again later."])
//     );
//   }
// }

// // ---------------------- Filters ----------------------
// function buildUserOrderFilters() {
//   return createElement("div", { class: "filters" }, [
//     buildLabeledSelect("Status", [
//       { value: "", label: "All" },
//       { value: "pending", label: "Pending" },
//       { value: "confirmed", label: "Confirmed" },
//       { value: "shipped", label: "Shipped" },
//       { value: "delivered", label: "Delivered" },
//     ]),
//     createElement("label", {}, [
//       "Date:",
//       createElement("input", { type: "date" }),
//     ]),
//     createElement("button", { type: "button" }, ["Filter"]),
//   ]);
// }

// // ---------------------- Responsive Layout ----------------------
// function buildResponsiveOrdersLayout(orders) {
//   const isMobile = window.innerWidth <= 768;

//   if (isMobile) {
//     return createElement("div", { class: "orders-cards" },
//       orders.length === 0
//         ? [createElement("p", {}, ["No orders found."])]
//         : orders.map(buildOrderCard)
//     );
//   }

//   return buildUserOrdersTable(orders);
// }

// // ---------------------- Desktop Table ----------------------
// function buildUserOrdersTable(orders) {
//   return createElement("table", { class: "orders-table" }, [
//     createElement("thead", {}, [
//       createElement("tr", {}, [
//         "Order ID",
//         "Farm Name",
//         "Crop",
//         "Qty",
//         "Order Date",
//         "Price",
//         "Status",
//         "Actions",
//       ].map((header) => createElement("th", {}, [header]))),
//     ]),
//     createElement(
//       "tbody",
//       {},
//       orders.length === 0
//         ? [createElement("tr", {}, [
//             createElement("td", { colspan: 8 }, ["No orders found."]),
//           ])]
//         : orders.map(buildUserOrderRow)
//     ),
//   ]);
// }

// function buildUserOrderRow(order) {
//   const cropItem = order.items?.crops?.[0] || {};
//   const farmName = cropItem.entityName || "Unknown Farm";
//   const cropName = cropItem.itemName || "N/A";
//   const qty = cropItem.quantity || order.quantity || 0;
//   const unit = cropItem.unit || "";
//   const price = order.priceAtPurchase || cropItem.price || 0;
//   const orderDate = formatDate(order.createdAt);
//   const status = capitalize(order.status);

//   return createElement("tr", {}, [
//     createElement("td", {}, [order.orderid]),
//     createElement("td", {}, [farmName]),
//     createElement("td", {}, [cropName]),
//     createElement("td", {}, [`${qty} ${unit}`]),
//     createElement("td", {}, [orderDate]),
//     createElement("td", {}, [formatINR(price)]),
//     createElement("td", {}, [status]),
//     createElement("td", {}, [
//       createElement("button", { onclick: () => markAsPaid(order.orderid) }, ["Mark Paid"]),
//       createElement("button", {
//         onclick: () => contactFarmer(cropItem.entityName, cropItem.entityId),
//       }, ["Contact"]),
//       createElement("button", { onclick: () => downloadReceipt(order) }, ["Receipt"]),
//     ]),
//   ]);
// }

// // ---------------------- Mobile Card ----------------------
// function buildOrderCard(order) {
//   const cropItem = order.items?.crops?.[0] || {};
//   const farmName = cropItem.entityName || "Unknown Farm";
//   const cropName = cropItem.itemName || "N/A";
//   const qty = cropItem.quantity || order.quantity || 0;
//   const unit = cropItem.unit || "";
//   const price = order.priceAtPurchase || cropItem.price || 0;
//   const orderDate = formatDate(order.createdAt);
//   const status = capitalize(order.status);

//   return createElement("div", { class: "order-card" }, [
//     createElement("p", {}, [`Order ID: ${order.orderid}`]),
//     createElement("p", {}, [`Farm: ${farmName}`]),
//     createElement("p", {}, [`Crop: ${cropName}`]),
//     createElement("p", {}, [`Qty: ${qty} ${unit}`]),
//     createElement("p", {}, [`Order Date: ${orderDate}`]),
//     createElement("p", {}, [`Price: ${formatINR(price)}`]),
//     createElement("p", {}, [`Status: ${status}`]),
//     createElement("div", { class: "order-actions" }, [
//       createElement("button", { onclick: () => markAsPaid(order.orderid) }, ["Mark Paid"]),
//       createElement("button", {
//         onclick: () => contactFarmer(cropItem.entityName, cropItem.entityId),
//       }, ["Contact"]),
//       createElement("button", { onclick: () => downloadReceipt(order) }, ["Receipt"]),
//     ]),
//   ]);
// }

// // ---------------------- Utilities ----------------------
// function buildLabeledSelect(labelText, options, attrs = {}) {
//   return createElement("label", {}, [
//     labelText + ":",
//     createElement(
//       "select",
//       attrs,
//       options.map(({ value, label }) =>
//         createElement("option", { value }, [label])
//       )
//     ),
//   ]);
// }

// function capitalize(text) {
//   return typeof text === "string"
//     ? text.charAt(0).toUpperCase() + text.slice(1)
//     : "";
// }

// function formatDate(dateStr) {
//   try {
//     const d = new Date(dateStr);
//     return d.toLocaleDateString("en-IN", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   } catch {
//     return dateStr || "N/A";
//   }
// }

// function formatINR(val) {
//   return Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//   }).format(val || 0);
// }

// // ---------------------- Action Handlers ----------------------
// function markAsPaid(orderId) {
//   console.log("Marking order as paid:", orderId);
//   // apiFetch(`/farmorders/${orderId}/mark-paid`, "POST")
// }

// function contactFarmer(farmName, farmId) {
//   console.log("Contacting farmer:", farmName, farmId);
//   alert(`Contact ${farmName || "Farmer"} via farm ID: ${farmId}`);
// }

// function downloadReceipt(order) {
//   console.log("Downloading receipt for:", order.orderid);
//   const blob = new Blob([JSON.stringify(order, null, 2)], {
//     type: "application/json",
//   });
//   const link = createElement("a", {
//     href: URL.createObjectURL(blob),
//     download: `receipt_${order.orderid}.json`,
//   });
//   document.body.appendChild(link);
//   link.click();
//   setTimeout(() => {
//     URL.revokeObjectURL(link.href);
//     link.remove();
//   }, 1000);
// }
