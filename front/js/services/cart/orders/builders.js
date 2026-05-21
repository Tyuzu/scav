import { getFilteredOrders, toggleExpanded, getOrderProducts, formatDate, formatINR, capitalize, downloadReceipt } from "./orderutils";
import { createElement } from "../../../components/createElement.js";

const PAGE_SIZE = 5;

/* ───────────────── Page ───────────────── */

export function buildOrdersPage(state, rerender) {
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

export function buildUserOrderFilters(state, rerender) {
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

export function buildOrdersSummary(filteredCount, totalCount, currentPage, totalPages) {
    return createElement("p", { class: "orders-summary" }, [
        `Showing ${filteredCount} of ${totalCount} order(s) · Page ${currentPage} of ${totalPages}`,
    ]);
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