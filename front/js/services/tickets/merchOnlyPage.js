import { displayMerchandise } from "../merch/merchService.js";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";
import Datex from "../../components/base/Datex.js";

async function fetchEventData(eventId) {
    const eventData = await apiFetch(`/events/event/${eventId}`);
    if (!eventData || !Array.isArray(eventData.merch)) {
        throw new Error("Invalid event data received.");
    }
    return eventData;
}

async function renderMerchPage(isLoggedIn, eventId, container) {
    try {
        container.replaceChildren();
        const eventData = await fetchEventData(eventId);
        const isCreator = isLoggedIn && getState("user") === eventData.creatorid;

        // === Event Header ===
        const header = createElement("div", { class: "event-header" }, [
            createElement("h1", { textContent: eventData.title }),
            createElement("p", { textContent: eventData.description || "No description available." }),
            createElement("div", { class: "event-meta" }, [
                // createElement("p", { textContent: `📅 Date: ${new Date(eventData.date).toLocaleString()}` }),
                createElement("p", { textContent: `📅 Date: ${Datex(eventData.date)}` }),
                createElement("p", { textContent: `📍 Location: ${eventData.placename || eventData.location || "TBA"}` }),
                createElement("p", { textContent: `🎟 Category: ${eventData.category || "Uncategorized"}` }),
                createElement("p", { textContent: `💲 Currency: ${eventData.currency || "N/A"}` }),
            ]),
        ].filter(Boolean));

        // === Organizer Info ===
        const organizer = (eventData.organizer_name || eventData.organizer_contact)
            ? createElement("div", { class: "event-organizer" }, [
                createElement("h3", { textContent: "Organizer" }),
                createElement("p", { textContent: `Name: ${eventData.organizer_name || "Unknown"}` }),
                createElement("p", { textContent: `Contact: ${eventData.organizer_contact || "Not Provided"}` }),
            ])
            : null;

        // === Merch Section ===
        const merchcon = createElement("div", { class: "merchxcon" }, []);
        const editTabs = createElement("div", { id: "edittabs" }, []);

        container.appendChild(header);
        if (organizer) container.appendChild(organizer);
        container.appendChild(editTabs);
        container.appendChild(merchcon);

        await displayMerchandise(merchcon, eventData.merch, "event", eventId, isCreator, isLoggedIn);

    } catch (error) {
        container.replaceChildren();
        container.appendChild(
            createElement("h1", { textContent: `Error loading event details: ${error.message}` })
        );
        Notify("Failed to load event details. Please try again later.", { type: "error", duration: 3000 });
    }
}

export { renderMerchPage };
