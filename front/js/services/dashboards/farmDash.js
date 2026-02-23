import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { createTabs } from "../../components/ui/createTabs.js";
import { displayOrders } from "../crops/orders/orders.js";

export function displayDash(content, isLoggedIn) {
  content.replaceChildren();

  if (!isLoggedIn) {
    const notLoggedInUI = createElement("div", { class: "dash-guest" }, [
      createElement("h2", {}, ["Welcome to your Dashboard"]),
      createElement("p", {}, ["Log in to access your farm stats, orders, and crop inventory."]),
      createElement("ul", {}, [
        createElement("li", {}, ["Track your crop inventory"]),
        createElement("li", {}, ["Manage and fulfill orders"]),
        createElement("li", {}, ["Save recipes and favorite crops"]),
      ]),
    ]);
    content.appendChild(notLoggedInUI);
    return;
  }

  const tabs = [
    { id: "overview", title: "Overview", render: renderOverviewTab },
    { id: "orders", title: "Orders", render: renderOrdersTab },
  ];

  const activeTabId = localStorage.getItem("dash-active-tab") || "overview";
  const tabUI = createTabs(tabs, "farmdash-tabs", activeTabId, (newTabId) => {
    localStorage.setItem("dash-active-tab", newTabId);
  });

  const dashContainer = createElement("div", { class: "farmdashpage" }, [tabUI]);
  content.appendChild(dashContainer);
}

function renderOverviewTab(container) {
  container.replaceChildren();

  apiFetch(`/dash/farms`)
    .then((response) => {
      if (!response.success || !response.farm) {
        renderOverviewFallback(container, response.message || "No farms found.");
        return;
      }

      const farm = response.farm;
      const crops = farm?.crops || [];

      container.appendChild(buildStatsSummary(farm, crops));
      container.appendChild(buildCropSection(crops));
      container.appendChild(buildFarmExtra(farm));
    })
    .catch((err) => {
      console.error("Error loading farm stats:", err);
      renderOverviewFallback(container, "Failed to load farm data. Please try again later.");
    });
}

function renderOrdersTab(container) {
  displayOrders(container);
}

function buildStatsSummary(farm, crops) {
  const totalCrops = crops.length;
  const totalQuantity = crops.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const totalValue = crops.reduce((sum, c) => sum + ((c.quantity || 0) * (c.price || 0)), 0);
  const uniqueCategories = new Set(crops.map(c => c.category)).size;
  const featuredCrops = crops.filter(c => c.featured).length;

  return createElement("div", { class: "stats-summary" }, [
    createElement("div", { class: "stat-card" }, [`Farm Name: ${farm.name}`]),
    createElement("div", { class: "stat-card" }, [`Total Crops: ${totalCrops}`]),
    createElement("div", { class: "stat-card" }, [`Crop Categories: ${uniqueCategories}`]),
    createElement("div", { class: "stat-card" }, [`Total Quantity: ${totalQuantity}`]),
    createElement("div", { class: "stat-card" }, [`Estimated Value: ₹${totalValue.toFixed(2)}`]),
    createElement("div", { class: "stat-card" }, [`Featured Crops: ${featuredCrops}`]),
  ]);
}

function buildCropSection(crops) {
  const cropSection = createElement("div", { class: "crop-distribution" }, [
    createElement("h3", {}, ["Crops"]),
  ]);

  if (crops.length === 0) {
    cropSection.appendChild(createElement("p", {}, ["No crops listed yet."]));
  } else {
    const cropList = createElement(
      "ul",
      {},
      crops.map((crop) =>
        createElement("li", {}, [
          `${crop.name} – ${crop.quantity} ${crop.unit} @ ₹${crop.price}/${crop.unit}`,
        ])
      )
    );
    cropSection.appendChild(cropList);
  }

  return cropSection;
}

function buildFarmExtra(farm) {
  return createElement("div", { class: "farm-extra" }, [
    createElement("h3", {}, ["Other Info"]),
    createElement("p", {}, [`Location: ${farm.location || "N/A"}`]),
    createElement("p", {}, [`Availability: ${farm.availabilityTiming || "N/A"}`]),
    createElement("p", {}, [`Contact: ${farm.contact || "N/A"}`]),
  ]);
}

function renderOverviewFallback(container, message) {
  container.appendChild(
    createElement("div", { class: "stats-summary empty-state" }, [
      createElement("h3", {}, ["No Farm Data Available"]),
      createElement("p", {}, [message]),
      createElement("div", { class: "stat-card" }, ["Crops Tracked: 0"]),
      createElement("div", { class: "stat-card" }, ["Orders Placed: 0"]),
      createElement("div", { class: "stat-card" }, ["Saved Items: 0"]),
      createElement("p", {}, [
        "It looks like you haven't created a farm yet. Let’s get started by creating one now!",
      ]),
      createElement("a", { href: "/create-farm", class: "create-farm-btn" }, ["📋 Create Farm"]),
    ])
  );

  container.appendChild(
    createElement("div", { class: "suggested-actions" }, [
      createElement("h3", {}, ["Next Steps"]),
      createElement("ul", {}, [
        createElement("li", {}, ["📌 Create your first farm profile"]),
        createElement("li", {}, ["🌽 Add crops and pricing info"]),
        createElement("li", {}, ["🛒 Start receiving orders"]),
      ]),
    ])
  );

  container.appendChild(
    createElement("div", { class: "community-stats" }, [
      createElement("h3", {}, ["Community Stats"]),
      createElement("p", {}, ["👩‍🌾 Active Farmers: 1,242"]),
      createElement("p", {}, ["🌱 Crops Listed: 12,340"]),
      createElement("p", {}, ["📦 Orders Fulfilled: 21,880"]),
    ])
  );
}

