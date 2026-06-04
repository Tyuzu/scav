import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";

export async function openNotificationsModal() {
    let notifications = [];
    let userId = getUserId();

    let page = 1;
    const limit = 20;
    let hasMore = true;
    let loading = false;

    async function fetchNotifications() {
        if (!userId || loading || !hasMore) return;

        loading = true;

        try {
            const res = await apiFetch(
                `/notifs/user/${userId}?page=${page}&limit=${limit}`
            );

            const items = res?.items || [];

            if (items.length < limit) {
                hasMore = false;
            }

            notifications = [...notifications, ...items];
            page += 1;
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            loading = false;
        }
    }

    await fetchNotifications();

    const content = createElement("div", {
        style: `
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 420px;
            overflow-y: auto;
            padding: 0.5rem;
        `
    });

    const listContainer = createElement("div", {
        style: `
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        `
    });

    function render() {
        listContainer.innerHTML = "";

        if (!notifications.length) {
            listContainer.appendChild(
                createElement("div", {
                    style: "text-align:center;color:#666;font-size:0.95rem;"
                }, ["No notifications"])
            );

            return;
        }

        for (const n of notifications) {
            const item = createNotificationItem(n, userId, (updated) => {
                const idx = notifications.findIndex(x => x.id === updated.id);
                if (idx !== -1) {
                    notifications[idx] = updated;
                    render();
                }
            });

            listContainer.appendChild(item);
        }

        if (hasMore) {
            const loadMoreBtn = createElement("button", {
                style: `
                    margin-top: 0.5rem;
                    padding: 0.5rem;
                    border: 1px solid #ddd;
                    background: #fff;
                    cursor: pointer;
                `,
                onclick: async () => {
                    await fetchNotifications();
                    render();
                }
            }, ["Load more"]);

            listContainer.appendChild(loadMoreBtn);
        }
    }

    render();
    content.appendChild(listContainer);

    const actionBar = createElement("div", {
        style: `
            display: flex;
            gap: 0.5rem;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
            margin-top: 1rem;
            justify-content: flex-end;
            flex-wrap: wrap;
        `
    });

    if (notifications.some(n => !n.isRead)) {
        const markAllBtn = createElement("button", {
            style: `
                background: #28a745;
                color: white;
                border: none;
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                cursor: pointer;
            `,
            onclick: async () => {
                try {
                    await apiFetch(`/notifs/user/${userId}/read-all`, {
                        method: "PUT"
                    });

                    notifications = notifications.map(n => ({
                        ...n,
                        isRead: true
                    }));

                    render();
                } catch (e) {
                    console.error(e);
                }
            }
        }, ["Mark all read"]);

        actionBar.appendChild(markAllBtn);
    }

    if (notifications.length) {
        const clearBtn = createElement("button", {
            style: `
                background: #dc3545;
                color: white;
                border: none;
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                cursor: pointer;
            `,
            onclick: async () => {
                if (!confirm("Clear all notifications?")) return;

                try {
                    await apiFetch(`/notifs/user/${userId}`, {
                        method: "DELETE"
                    });

                    notifications = [];
                    render();
                } catch (e) {
                    console.error(e);
                }
            }
        }, ["Clear"]);

        actionBar.appendChild(clearBtn);
    }

    if (actionBar.children.length) {
        content.appendChild(actionBar);
    }

    Modal({
        title: "Notifications",
        content,
        size: "medium",
        showCloseButton: true
    });
}

function createNotificationItem(n, userId, onUpdate) {
    const item = createElement("div", {
        style: `
            padding: 0.75rem;
            border-radius: 6px;
            border: 1px solid ${n.isRead ? "#ddd" : "#b3dfe6"};
            background: ${n.isRead ? "#f7f7f7" : "#e8f4f8"};
            display: flex;
            justify-content: space-between;
            gap: 0.75rem;
        `
    });

    const left = createElement("div", {
        style: "flex:1;min-width:0;"
    });

    left.appendChild(
        createElement("strong", {}, [n.title || n.type || "Notification"])
    );

    left.appendChild(
        createElement("p", {
            style: "margin:0;font-size:0.85rem;color:#666;"
        }, [n.message || ""])
    );

    left.appendChild(
        createElement("small", {
            style: "color:#999;font-size:0.75rem;"
        }, [timeAgo(new Date(n.createdAt))])
    );

    item.appendChild(left);

    if (!n.isRead) {
        const btn = createElement("button", {
            style: `
                background:#007bff;
                color:#fff;
                border:none;
                padding:0.3rem 0.6rem;
                border-radius:4px;
                cursor:pointer;
                height:fit-content;
            `,
            onclick: async (e) => {
                e.stopPropagation();

                try {
                    await apiFetch(`/notifs/notif/${n.id}/read`, {
                        method: "PUT"
                    });

                    onUpdate({
                        ...n,
                        isRead: true
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        }, ["Read"]);

        item.appendChild(btn);
    }

    return item;
}

function getUserId() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw);
            return parsed.id || parsed._id || null;
        } catch {
            return raw;
        }
    } catch {
        return null;
    }
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;

    return date.toLocaleDateString();
}