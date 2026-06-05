// components/notifications/modal.js
import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";

export async function openNotificationsModal() {
    let notifications = [];
    let userId = null;

    // Get current user ID (from localStorage or auth token)
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                // Try to parse as JSON first
                const user = JSON.parse(userStr);
                userId = user.id || user._id;
            // eslint-disable-next-line no-unused-vars
            } catch (parseError) {
                // If not JSON, treat as direct user ID string
                userId = userStr;
            }
        }
    } catch (e) {
        console.error("Failed to get user ID from storage", e);
    }

    // Fetch notifications from backend
    if (userId) {
        try {
            const response = await apiFetch(`/notifs/user/${userId}`);
            if (response && Array.isArray(response)) {
                notifications = response.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }

    const content = createElement("div", {
        style: `
            display: flex; 
            flex-direction: column; 
            gap: 0.75rem; 
            max-height: 400px; 
            overflow-y: auto; 
            padding: 0.5rem;
        `
    });

    if (!notifications.length) {
        content.appendChild(
            createElement("div", {
                style: `
                    text-align: center; 
                    color: #666; 
                    font-size: 0.95rem;
                `
            }, ["🔔 No new notifications."])
        );
        content.appendChild(
            createElement("p", {
                style: "text-align:center; font-size:0.85rem; color:#888;"
            }, ["Check back later for updates."])
        );
    } else {
        notifications.forEach(n => {
            const notifItem = createElement("div", {
                style: `
                    padding: 0.75rem 1rem; 
                    border-radius: 6px; 
                    background: ${n.isRead ? "#f7f7f7" : "#e8f4f8"}; 
                    border: 1px solid ${n.isRead ? "#ddd" : "#b3dfe6"};
                    cursor: pointer;
                    transition: background-color 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.75rem;
                `
            });

            // Left content
            const leftContent = createElement("div", {
                style: "flex: 1; min-width: 0;"
            });

            leftContent.appendChild(
                createElement("strong", {
                    style: `
                        display: block; 
                        margin-bottom: 0.25rem;
                        font-size: 0.95rem;
                        ${n.isRead ? "" : "color: #333;"}
                    `
                }, [n.title || n.type || "Notification"])
            );

            leftContent.appendChild(
                createElement("p", {
                    style: `
                        margin: 0; 
                        font-size: 0.85rem; 
                        color: #666;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    `
                }, [n.message || "No details provided."])
            );

            const timestamp = new Date(n.createdAt);
            leftContent.appendChild(
                createElement("small", {
                    style: "color: #999; font-size: 0.8rem; display: block; margin-top: 0.25rem;"
                }, [timeAgo(timestamp)])
            );

            notifItem.appendChild(leftContent);

            // Right action button
            if (!n.isRead && userId) {
                const markReadBtn = createElement("button", {
                    style: `
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 0.4rem 0.8rem;
                        border-radius: 4px;
                        font-size: 0.8rem;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: background-color 0.2s;
                    `
                }, ["Mark Read"]);

                markReadBtn.addEventListener("mouseover", () => {
                    markReadBtn.style.backgroundColor = "#0056b3";
                });

                markReadBtn.addEventListener("mouseout", () => {
                    markReadBtn.style.backgroundColor = "#007bff";
                });

                markReadBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    try {
                        await apiFetch(`/notifs/notif/${n.id}/read`, {
                            method: "PUT"
                        });
                        notifItem.style.backgroundColor = "#f7f7f7";
                        notifItem.style.borderColor = "#ddd";
                        markReadBtn.style.display = "none";
                    } catch (error) {
                        console.error("Failed to mark notification as read", error);
                    }
                });

                notifItem.appendChild(markReadBtn);
            }

            content.appendChild(notifItem);
        });
    }

    // Add action buttons at the bottom
    const actionBar = createElement("div", {
        style: `
            display: flex;
            gap: 0.5rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
            margin-top: 1rem;
            flex-wrap: wrap;
            justify-content: flex-end;
        `
    });

    if (notifications.some(n => !n.isRead) && userId) {
        const markAllBtn = createElement("button", {
            style: `
                background: #28a745;
                color: white;
                border: none;
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: background-color 0.2s;
            `,
            onclick: async () => {
                try {
                    await apiFetch(`/notifs/user/${userId}/read-all`, {
                        method: "PUT"
                    });
                    location.reload(); // Reload to refresh
                } catch (error) {
                    console.error("Failed to mark all as read", error);
                }
            }
        }, ["Mark All Read"]);

        markAllBtn.addEventListener("mouseover", () => {
            markAllBtn.style.backgroundColor = "#218838";
        });
        markAllBtn.addEventListener("mouseout", () => {
            markAllBtn.style.backgroundColor = "#28a745";
        });

        actionBar.appendChild(markAllBtn);
    }

    if (notifications.length > 0 && userId) {
        const clearBtn = createElement("button", {
            style: `
                background: #dc3545;
                color: white;
                border: none;
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: background-color 0.2s;
            `,
            onclick: async () => {
                if (confirm("Clear all notifications?")) {
                    try {
                        await apiFetch(`/notifs/user/${userId}`, {
                            method: "DELETE"
                        });
                        location.reload(); // Reload to refresh
                    } catch (error) {
                        console.error("Failed to clear notifications", error);
                    }
                }
            }
        }, ["Clear All"]);

        clearBtn.addEventListener("mouseover", () => {
            clearBtn.style.backgroundColor = "#c82333";
        });
        clearBtn.addEventListener("mouseout", () => {
            clearBtn.style.backgroundColor = "#dc3545";
        });

        actionBar.appendChild(clearBtn);
    }

    if (actionBar.children.length > 0) {
        content.appendChild(actionBar);
    }

    // Create and open modal
    Modal({
        title: "📬 Notifications",
        content: content,
        size: "medium",
        showCloseButton: true,
    });
}

// Helper function to format time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) {
        return "Just now";
    }
    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ago`;
    }
    if (seconds < 2592000) {
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    return date.toLocaleDateString();
}
