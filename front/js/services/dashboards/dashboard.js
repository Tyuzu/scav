import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";

// Dummy apiFetch
export async function apiFetch(endpoint, method = "GET") {
  await new Promise(r => setTimeout(r, 100)); // simulate latency

  const dummy = {
    "/user/farms": [
      { id: 1, name: "Green Meadows", location: "Valley Town", status: "Open" },
      { id: 2, name: "Sunny Acres",   location: "River Side",   status: "Closed" },
    ],
    "/user/products": [
      { id: 1, name: "Tomatoes",   stock: 120, price: "$2.50/lb" },
      { id: 2, name: "Corn",       stock:  80, price: "$1.80/ear" },
    ],
    "/user/events": [
      { id: 1, name: "Farmers Market",  date: "2025-07-10T10:00:00Z" },
      { id: 2, name: "Harvest Festival", date: "2025-06-15T12:00:00Z" },
    ]
  };

  if (method !== "GET") throw new Error("Mock only GET");
  if (endpoint in dummy) return dummy[endpoint];
  throw new Error(`Unknown endpoint: ${endpoint}`);
}

export async function displayDash(contentContainer, isLoggedIn) {
  if (!isLoggedIn) {
    contentContainer.textContent = "You must be logged in to view the dashboard.";
    return;
  }

  // 1) Fetch all data in parallel
  const [farms, products, events] = await Promise.all([
    apiFetch("/user/farms"),
    apiFetch("/user/products"),
    apiFetch("/user/events")
  ]);

  // 2) Build & attach layout
  const { wrapper, sidebar, main } = createLayout();
  contentContainer.replaceChildren(wrapper);

  // 3) Create nav buttons
  const summaryBtn = Button("Summary", "", {
    click: () => renderSummary(main, { farms, products, events })
  });
  const farmsBtn   = Button("Farms",   "", {
    click: () => renderFarmDashboard(main, farms)
  });
  const productsBtn= Button("Products","", {
    click: () => renderProductDashboard(main, products)
  });
  const eventsBtn  = Button("Events",  "", {
    click: () => renderEventsDashboard(main, events)
  });

  sidebar.append(summaryBtn, farmsBtn, productsBtn, eventsBtn);

  // 4) Show initial summary view
  renderSummary(main, { farms, products, events });
}


/* —————————————————————————
   Layout & Helpers
————————————————————————— */

function createLayout() {
  const wrapper = createElement("div", { className: "dashboard-wrapper" });
  const sidebar = createElement("div", { className: "dashboard-sidebar" });
  const main    = createElement("div", { className: "dashboard-main" });
  wrapper.append(sidebar, main);
  return { wrapper, sidebar, main };
}

function clearMain(main) {
  main.replaceChildren();
}

function createStatCard(title, value, note) {
  const card = createElement("div", { className: "stat-card" });
  card.append(
    createElement("h3", {}, [title]),
    createElement("p", { className: "stat-value" }, [String(value)]),
    note
      ? createElement("small", { className: "stat-note" }, [note])
      : null
  );
  return card;
}


/* —————————————————————————
   Renderers
————————————————————————— */

function renderSummary(main, { farms, products, events }) {
  clearMain(main);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) > now).length;
  const past     = events.length - upcoming;

  const statsContainer = createElement("div", { className: "summary-stats" });
  statsContainer.append(
    createStatCard("Farms",     farms.length,      null),
    createStatCard("Products",  products.length,   null),
    createStatCard("Upcoming Events", upcoming, `${past} past`)
  );

  main.append(createElement("h2", {}, ["Dashboard Summary"]), statsContainer);
}

function renderFarmDashboard(main, farms) {
  clearMain(main);
  main.append(createElement("h2", {}, ["Your Farms"]));
  farms.forEach(f => {
    const row = createElement("div", { className: "farm-row" });
    row.append(
      createElement("strong", {}, [f.name]),
      createElement("span", {}, [`Location: ${f.location}`]),
      createElement("em", {}, [`Status: ${f.status}`]),
      // edit/delete buttons as an example:
      Button("Edit",  "", { click: () => alert(`Edit ${f.id}`) }, "small"),
      Button("Delete","", { click: () => alert(`Delete ${f.id}`) }, "small danger")
    );
    main.append(row);
  });
}

function renderProductDashboard(main, products) {
  clearMain(main);
  main.append(createElement("h2", {}, ["Your Products"]));
  products.forEach(p => {
    const row = createElement("div", { className: "product-row" });
    row.append(
      createElement("strong", {}, [p.name]),
      createElement("span", {}, [`Stock: ${p.stock}`]),
      createElement("span", {}, [`Price: ${p.price}`]),
      Button("Restock", "", { click: () => alert(`Restock ${p.id}`) }, "small"),
      Button("Remove",  "", { click: () => alert(`Remove ${p.id}`) }, "small danger")
    );
    main.append(row);
  });
}

function renderEventsDashboard(main, events) {
  clearMain(main);
  main.append(createElement("h2", {}, ["Your Events"]));
  events.forEach(e => {
    // const date = new Date(e.date).toLocaleString();
    const date = Datex(e.date);
    const row = createElement("div", { className: "event-row" });
    row.append(
      createElement("strong", {}, [e.name]),
      createElement("span", {}, [`Date: ${date}`]),
      Button("Details", "", { click: () => alert(`Event ID: ${e.id}`) }, "small")
    );
    main.append(row);
  });
}
