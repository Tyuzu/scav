import { apiFetch } from "../../../api/api";

export async function markOrderDelivered(orderId) {
  try {
    const response = await apiFetch(`/farmorders/${orderId}/delivered`, { method: "POST" });
    return response.success;
  } catch (err) {
    console.error(`Failed to mark order ${orderId} as delivered:`, err);
    return false;
  }
}

export async function rejectOrder(orderId) {
  try {
    const response = await apiFetch(`/farmorders/${orderId}/reject`, { method: "POST" });
    return response.success;
  } catch (err) {
    console.error(`Failed to reject order ${orderId}:`, err);
    return false;
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const response = await apiFetch(`/farmorders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.success;
  } catch (err) {
    console.error(`Failed to update order ${orderId} status:`, err);
    return false;
  }
}

export async function fetchIncomingOrders() {
  try {
    const response = await apiFetch("/orders/incoming");
    if (!response.success || !Array.isArray(response.orders)) {
      throw new Error("Invalid response");
    }
    return response.orders;
  } catch (err) {
    console.error("Failed to fetch incoming orders:", err);
    throw err;
  }
}
