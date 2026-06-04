import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { createTabs } from "../../components/ui/createTabs.js";
import { displayOrders } from "../crops/orders/orders.js";
import { displayMyFarm } from "../crops/farm/myFarms.js";

export function displayDash(content, isLoggedIn) {
  content.replaceChildren();

  if (!isLoggedIn) {
    content.appendChild(
      createElement("div", { class: "dash-guest" }, [
        createElement("h2", {}, ["Welcome to your Farm Dashboard"]),
        createElement("p", {}, [
          "Log in to view farm performance, inventory, orders, and revenue.",
        ]),
      ])
    );
    return;
  }

  const tabs = [
    { id: "overview", title: "Overview", render: renderOverviewTab },
    { id: "orders", title: "Orders", render: renderOrdersTab },
    { id: "myfarm", title: "My Farm", render: renderMyFarmTab },
  ];

  const activeTabId =
    localStorage.getItem("dash-active-tab") || "overview";

  const tabUI = createTabs(
    tabs,
    "farmdash-tabs",
    activeTabId,
    (newTabId) => {
      localStorage.setItem("dash-active-tab", newTabId);
    }
  );

  content.appendChild(
    createElement("div", { class: "farmdashpage" }, [tabUI])
  );
}

function renderOverviewTab(container) {
  container.replaceChildren();

  apiFetch("/dash/farms")
    .then((response) => {
      if (!response.success || !response.farm) {
        renderOverviewFallback(
          container,
          response.message || "Farm not found."
        );
        return;
      }

      const farm = response.farm;
      const dashboard = response.dashboard || {};
      const crops = farm.crops || [];

      container.appendChild(buildStatsSummary(farm, dashboard));
      container.appendChild(buildRevenueSection(dashboard.revenue || {}));
      container.appendChild(buildOrdersSection(dashboard.orders || {}));
      container.appendChild(buildAlertsSection(dashboard.alerts || []));
      container.appendChild(
        buildRecommendationsSection(
          dashboard.recommendations || []
        )
      );
      container.appendChild(
        buildTopCropsSection(dashboard.topCrops || [])
      );
      container.appendChild(
        buildRecentOrdersSection(
          dashboard.recentOrders || []
        )
      );
      container.appendChild(buildCropSection(crops));
      container.appendChild(buildFarmExtra(farm));
    })
    .catch((err) => {
      console.error("Dashboard load failed:", err);

      renderOverviewFallback(
        container,
        "Failed to load dashboard."
      );
    });
}

function renderOrdersTab(container) {
  displayOrders(container);
}

function renderMyFarmTab(container) {
  displayMyFarm(container);
}

function buildStatsSummary(farm, dashboard) {
  const inventory = dashboard.inventory || {};
  const stats = dashboard.stats || {};

  return createElement("div", { class: "stats-summary" }, [
    createElement("div", { class: "stat-card" }, [
      `Farm: ${farm.name}`,
    ]),

    createElement("div", { class: "stat-card" }, [
      `Health Score: ${stats.healthScore || 0}%`,
    ]),

    createElement("div", { class: "stat-card" }, [
      `Total Crops: ${inventory.totalCrops || 0}`,
    ]),

    createElement("div", { class: "stat-card" }, [
      `Inventory Qty: ${inventory.totalQuantity || 0}`,
    ]),

    createElement("div", { class: "stat-card" }, [
      `Inventory Value: ₹${(
        inventory.inventoryValue || 0
      ).toFixed(2)}`,
    ]),

    createElement("div", { class: "stat-card" }, [
      `Featured Crops: ${inventory.featuredCrops || 0}`,
    ]),
  ]);
}

function buildRevenueSection(revenue) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Revenue"]),

    createElement("div", { class: "stats-summary" }, [
      createElement("div", { class: "stat-card" }, [
        `Monthly Revenue: ₹${(
          revenue.monthly || 0
        ).toFixed(2)}`,
      ]),

      createElement("div", { class: "stat-card" }, [
        `Lifetime Revenue: ₹${(
          revenue.lifetime || 0
        ).toFixed(2)}`,
      ]),
    ]),
  ]);
}

function buildOrdersSection(orders) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Orders"]),

    createElement("div", { class: "stats-summary" }, [
      createElement("div", { class: "stat-card" }, [
        `Pending: ${orders.pending || 0}`,
      ]),

      createElement("div", { class: "stat-card" }, [
        `Delivered: ${orders.delivered || 0}`,
      ]),

      createElement("div", { class: "stat-card" }, [
        `Today's Orders: ${orders.today || 0}`,
      ]),

      createElement("div", { class: "stat-card" }, [
        `Customers: ${orders.customers || 0}`,
      ]),
    ]),
  ]);
}

function buildAlertsSection(alerts) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Alerts"]),

    alerts.length === 0
      ? createElement("p", {}, ["No active alerts"])
      : createElement(
          "ul",
          {},
          alerts.map((alert) =>
            createElement("li", {}, [
              `[${(alert.severity || "").toUpperCase()}] ${alert.message}`,
            ])
          )
        ),
  ]);
}

function buildRecommendationsSection(recommendations) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Recommendations"]),

    recommendations.length === 0
      ? createElement("p", {}, ["No recommendations"])
      : createElement(
          "ul",
          {},
          recommendations.map((item) =>
            createElement("li", {}, [item])
          )
        ),
  ]);
}

function buildTopCropsSection(crops) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Top Inventory Value Crops"]),

    crops.length === 0
      ? createElement("p", {}, ["No crop data"])
      : createElement(
          "ul",
          {},
          crops.map((crop) =>
            createElement("li", {}, [
              `${crop.name} • ${crop.quantity} ${crop.unit} • ₹${(
                crop.value || 0
              ).toFixed(2)}`,
            ])
          )
        ),
  ]);
}

function buildRecentOrdersSection(orders) {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Recent Orders"]),

    orders.length === 0
      ? createElement("p", {}, ["No recent orders"])
      : createElement(
          "ul",
          {},
          orders.map((order) =>
            createElement("li", {}, [
              `${order.orderId} • ${order.status} • ₹${(
                order.total || 0
              ).toFixed(2)}`,
            ])
          )
        ),
  ]);
}

function buildCropSection(crops) {
  const section = createElement(
    "div",
    { class: "crop-distribution" },
    [createElement("h3", {}, ["Current Inventory"])]
  );

  if (!crops.length) {
    section.appendChild(
      createElement("p", {}, ["No crops listed yet."])
    );
    return section;
  }

  section.appendChild(
    createElement(
      "ul",
      {},
      crops.map((crop) =>
        createElement("li", {}, [
          `${crop.name} • ${crop.quantity} ${crop.unit} • ₹${crop.price}/${crop.unit}`,
        ])
      )
    )
  );

  return section;
}

function buildFarmExtra(farm) {
  return createElement("div", { class: "farm-extra" }, [
    createElement("h3", {}, ["Farm Information"]),

    createElement("p", {}, [
      `Location: ${farm.location || "N/A"}`,
    ]),

    createElement("p", {}, [
      `Availability: ${
        farm.availabilityTiming || "N/A"
      }`,
    ]),

    createElement("p", {}, [
      `Contact: ${farm.contact || "N/A"}`,
    ]),

    createElement("p", {}, [
      `Owner: ${farm.owner || "N/A"}`,
    ]),
  ]);
}

function renderOverviewFallback(container, message) {
  container.appendChild(
    createElement("div", { class: "empty-state" }, [
      createElement("h3", {}, ["No Farm Found"]),
      createElement("p", {}, [message]),

      createElement(
        "a",
        {
          href: "/create-farm",
          class: "create-farm-btn",
        },
        ["Create Farm"]
      ),
    ])
  );
}