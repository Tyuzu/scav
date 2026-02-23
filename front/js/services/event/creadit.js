import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import { generateEventForm } from "./createOrEditEvent.js";
import Notify from "../../components/ui/Notify.mjs";

/** Create a new event */
function createEvent(isLoggedIn, container) {
    // Simply generate a blank form
    generateEventForm(isLoggedIn, container);
}

/** Edit an existing event */
async function editEvent(isLoggedIn, eventId, container) {
    if (!isLoggedIn) {
        Notify("Please log in to edit an event.", { type: "warning", duration: 3000, dismissible: true });
        navigate("/login");
        return;
    }

    try {
        const eventData = await apiFetch(`/events/event/${eventId}`);
        generateEventForm(isLoggedIn, container, eventData);
    } catch (error) {
        console.error("Error fetching event data:", error);
        Notify(`Error loading event: ${error.message}`, { type: "error", duration: 3000, dismissible: true });
    }
}

export { createEvent, editEvent };
