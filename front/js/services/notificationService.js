// services/notificationService.js
import { apiFetch } from "../utils/apiFetch.js";

/**
 * Notification Service - handles all notification-related API calls
 */

export const notificationService = {
    /**
     * Get all notifications for the current user
     * @param {string} userId - The user ID
     * @param {boolean} unreadOnly - If true, only fetch unread notifications
     * @returns {Promise<Array>} Array of notifications
     */
    async getNotifications(userId, unreadOnly = false) {
        try {
            const url = `/api/v1/notifs/user/${userId}${unreadOnly ? "?unread=true" : ""}`;
            return await apiFetch(url);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    },

    /**
     * Get unread notification count
     * @param {string} userId - The user ID
     * @returns {Promise<number>} Count of unread notifications
     */
    async getUnreadCount(userId) {
        try {
            const response = await apiFetch(`/api/v1/notifs/user/${userId}/unread`);
            return response?.count || 0;
        } catch (error) {
            console.error("Error fetching unread count:", error);
            return 0;
        }
    },

    /**
     * Create a new notification
     * @param {Object} data - Notification data
     * @returns {Promise<Object>} Created notification
     */
    async createNotification(data) {
        try {
            return await apiFetch("/api/v1/notifs", {
                method: "POST",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            console.error("Error creating notification:", error);
            throw error;
        }
    },

    /**
     * Bulk create notifications
     * @param {Array} notifications - Array of notification objects
     * @returns {Promise<Object>} Result with count and IDs
     */
    async bulkCreateNotifications(notifications) {
        try {
            return await apiFetch("/api/v1/notifs/bulk", {
                method: "POST",
                body: JSON.stringify({ notifications }),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            console.error("Error bulk creating notifications:", error);
            throw error;
        }
    },

    /**
     * Mark a single notification as read
     * @param {string} notificationId - The notification ID
     * @returns {Promise<Object>} Update result
     */
    async markAsRead(notificationId) {
        try {
            return await apiFetch(`/api/v1/notifs/notif/${notificationId}/read`, {
                method: "PUT"
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read for a user
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} Update result
     */
    async markAllAsRead(userId) {
        try {
            return await apiFetch(`/api/v1/notifs/user/${userId}/read-all`, {
                method: "PUT"
            });
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            throw error;
        }
    },

    /**
     * Delete a specific notification
     * @param {string} notificationId - The notification ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteNotification(notificationId) {
        try {
            return await apiFetch(`/api/v1/notifs/notif/${notificationId}`, {
                method: "DELETE"
            });
        } catch (error) {
            console.error("Error deleting notification:", error);
            throw error;
        }
    },

    /**
     * Clear all notifications for a user
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} Delete result
     */
    async clearAllNotifications(userId) {
        try {
            return await apiFetch(`/api/v1/notifs/user/${userId}`, {
                method: "DELETE"
            });
        } catch (error) {
            console.error("Error clearing notifications:", error);
            throw error;
        }
    },

    /**
     * Get notification preferences
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} Notification preferences
     */
    async getPreferences(userId) {
        try {
            return await apiFetch(`/api/v1/notifs/user/${userId}/preferences`);
        } catch (error) {
            console.error("Error fetching notification preferences:", error);
            return {
                mentionsEnabled: true,
                followsEnabled: true,
                commentsEnabled: true,
                likesEnabled: true,
                messagesEnabled: true,
                allEnabled: true
            };
        }
    },

    /**
     * Update notification preferences
     * @param {string} userId - The user ID
     * @param {Object} preferences - Preferences object
     * @returns {Promise<Object>} Updated preferences
     */
    async updatePreferences(userId, preferences) {
        try {
            return await apiFetch(`/api/v1/notifs/user/${userId}/preferences`, {
                method: "PUT",
                body: JSON.stringify(preferences),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            console.error("Error updating notification preferences:", error);
            throw error;
        }
    }
};

export default notificationService;
