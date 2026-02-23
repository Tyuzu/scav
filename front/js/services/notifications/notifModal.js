// components/notifications/modal.js
import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

export async function openNotificationsModal() {
    // Fetch notifications if needed later
    // const notifications = await apiFetch("/notifications");

    const notifications = []; // placeholder

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
            const item = createElement("div", {
                style: `
                    padding: 0.75rem 1rem; 
                    border-radius: 6px; 
                    background: #f7f7f7; 
                    border: 1px solid #ddd;
                `
            }, [
                createElement("strong", {}, [n.title || "Notification"]),
                createElement("p", {}, [n.message || "No details provided."])
            ]);
            content.appendChild(item);
        });
    }

    Modal({
        title: "Notifications",
        content,
        actions: () => createElement("div", {
            style: "display: flex; justify-content: flex-end;"
        }, [
            Button("Close", "", {
                click: e => e.target.closest(".modal")?.remove()
            })
        ])
    });
}
