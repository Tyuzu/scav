import { apiFetch } from "../../../api/api";

// ============================================================
// Single Order Actions
// ============================================================

export async function acceptOrder(orderId) {
  try {
    const response = await apiFetch(`/farmorders/order/${orderId}/accept`, { method: "POST" });
    return response.success;
  } catch (err) {
    console.error(`Failed to accept order ${orderId}:`, err);
    return false;
  }
}

export async function rejectOrder(orderId) {
  try {
    const response = await apiFetch(`/farmorders/order/${orderId}/reject`, { method: "POST" });
    return response.success;
  } catch (err) {
    console.error(`Failed to reject order ${orderId}:`, err);
    return false;
  }
}

export async function markOrderDelivered(orderId) {
  try {
    const response = await apiFetch(`/farmorders/order/${orderId}/deliver`, { method: "POST" });
    return response.success;
  } catch (err) {
    console.error(`Failed to mark order ${orderId} as delivered:`, err);
    return false;
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const response = await apiFetch(`/farmorders/order/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.success;
  } catch (err) {
    console.error(`Failed to update order ${orderId} status:`, err);
    return false;
  }
}

// ============================================================
// Bulk Order Actions
// ============================================================

export async function bulkAcceptOrders(orderIds) {
  try {
    const response = await apiFetch("/farmorders/bulk/accept", {
      method: "POST",
      body: JSON.stringify({ orderIds }),
    });
    return {
      success: response.success,
      updated: response.updated || 0,
      failed: response.failed || 0,
      message: response.message,
      errors: response.errors || [],
    };
  } catch (err) {
    console.error("Failed to bulk accept orders:", err);
    return {
      success: false,
      updated: 0,
      failed: orderIds.length,
      message: "Failed to bulk accept orders",
      errors: [err.message],
    };
  }
}

export async function bulkRejectOrders(orderIds) {
  try {
    const response = await apiFetch("/farmorders/bulk/reject", {
      method: "POST",
      body: JSON.stringify({ orderIds }),
    });
    return {
      success: response.success,
      updated: response.updated || 0,
      failed: response.failed || 0,
      message: response.message,
      errors: response.errors || [],
    };
  } catch (err) {
    console.error("Failed to bulk reject orders:", err);
    return {
      success: false,
      updated: 0,
      failed: orderIds.length,
      message: "Failed to bulk reject orders",
      errors: [err.message],
    };
  }
}

export async function bulkMarkOrdersDelivered(orderIds) {
  try {
    const response = await apiFetch("/farmorders/bulk/deliver", {
      method: "POST",
      body: JSON.stringify({ orderIds }),
    });
    return {
      success: response.success,
      updated: response.updated || 0,
      failed: response.failed || 0,
      message: response.message,
      errors: response.errors || [],
    };
  } catch (err) {
    console.error("Failed to bulk mark orders as delivered:", err);
    return {
      success: false,
      updated: 0,
      failed: orderIds.length,
      message: "Failed to bulk mark orders as delivered",
      errors: [err.message],
    };
  }
}

// ============================================================
// Fetch Orders (with optional filters)
// ============================================================

export async function fetchIncomingOrders(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append("status", filters.status);
    }
    if (filters.crop) {
      params.append("crop", filters.crop);
    }
    if (filters.payment) {
      params.append("payment", filters.payment);
    }
    if (filters.dateFrom) {
      params.append("dateFrom", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append("dateTo", filters.dateTo);
    }

    const url = params.toString() 
      ? `/orders/incoming?${params.toString()}`
      : "/orders/incoming";

    const response = await apiFetch(url);
    if (!response.success || !Array.isArray(response.orders)) {
      throw new Error("Invalid response");
    }
    return response.orders;
  } catch (err) {
    console.error("Failed to fetch incoming orders:", err);
    throw err;
  }
}
