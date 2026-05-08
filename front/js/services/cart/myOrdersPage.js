import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { buildOrdersPage } from "./orders/builders.js";
import { normalizeOrders } from "./orders/orderutils.js";


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
