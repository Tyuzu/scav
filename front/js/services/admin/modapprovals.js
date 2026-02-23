import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

export async function loadModeratorApplications(container) {
    container.replaceChildren(); // clear existing content

    const apps = await apiFetch("/moderator/applications?status=pending");
    if (!Array.isArray(apps) || apps.length === 0) {
        container.appendChild(createElement("p", { }, ["No pending moderator applications."]));
        return;
    }

    apps.forEach(app => {
        const approveBtn = Button("Approve", "", {
            click: async () => await handleApproval(app.id, true, container)
        }, "approve-btn");

        const rejectBtn = Button("Reject", "", {
            click: async () => await handleApproval(app.id, false, container)
        }, "reject-btn");

        const item = createElement("div", { "data-id": app.id, style: "margin-bottom:12px;padding:8px;border:1px solid #ccc;" }, [
            createElement("p", {}, [`User ID: ${app.userId}`]),
            createElement("p", {}, [`Reason: ${app.reason}`]),
            createElement("p", {}, [`Status: ${app.status}`]),
            createElement("div", { style: "margin-top:6px;display:flex;gap:8px;" }, [approveBtn, rejectBtn])
        ]);

        container.appendChild(item);
    });
}

async function handleApproval(id, approve, container) {
    const endpoint = approve ? `/moderator/approve/${id}` : `/moderator/reject/${id}`;
    const method = "PUT";

    try {
        const res = await apiFetch(endpoint, method);
        alert(res.message || (approve ? "Approved" : "Rejected"));
        await loadModeratorApplications(container);
    } catch (err) {
        console.error(err);
        alert("Failed to update application.");
    }
}


/*

import { loadModeratorApplications } from "./moderatorList.js";

const container = document.getElementById("moderator-list");
loadModeratorApplications(container);


*/