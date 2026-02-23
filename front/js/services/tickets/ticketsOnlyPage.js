import { displayTickets } from "../tickets/displayTickets.js";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";
import Datex from "../../components/base/Datex.js";

/* ────────── Fetch Event ────────── */
async function fetchEventData(eventId) {
    const eventData = await apiFetch(
        `/events/event/${eventId}`,
        "GET"
    );

    if (!eventData || !Array.isArray(eventData.tickets)) {
        throw new Error("Invalid event data received.");
    }

    return eventData;
}

/* ────────── Render Tickets Page ────────── */
async function renderTicksPage(isLoggedIn, eventId, containerx) {
    containerx.replaceChildren();

    const container = createElement(
        "div",
        { class: "tickscon" }
    );

    containerx.append(container);

    try {
        const eventData = await fetchEventData(eventId);

        const currentUserId = getState("user");
        const isCreator =
            isLoggedIn &&
            currentUserId &&
            currentUserId === eventData.creatorid;

        /* Header */
        const header = createElement("header", { class: "event-header" }, [
            createElement("h1", {}, [eventData.title]),
            createElement(
                "p",
                { class: "event-description" },
                [eventData.description || "No description available."]
            ),
            createElement("section", { class: "event-meta" }, [
                createElement("p", {}, [`Date: ${Datex(eventData.date, true)}`]),
                createElement(
                    "p",
                    {},
                    [`Location: ${eventData.placename || eventData.location || "TBA"}`]
                ),
                createElement(
                    "p",
                    {},
                    [`Category: ${eventData.category || "Uncategorized"}`]
                ),
                createElement(
                    "p",
                    {},
                    [`Currency: ${eventData.currency || "N/A"}`]
                )
            ])
        ]);

        /* Organizer */
        let organizer;
        if (eventData.organizer_name || eventData.organizer_contact) {
            organizer = createElement("aside", { class: "event-organizer" }, [
                createElement("h2", {}, ["Organizer"]),
                createElement(
                    "p",
                    {},
                    [`Name: ${eventData.organizer_name || "Unknown"}`]
                ),
                createElement(
                    "p",
                    {},
                    [`Contact: ${eventData.organizer_contact || "Not Provided"}`]
                )
            ]);
        }

        /* Main */
        const editTabs = createElement(
            "nav",
            { id: "edittabs", class: "edit-tabs" }
        );

        const ticketSection = createElement("section", {
            class: "ticket-section",
            "aria-label": "Ticket List"
        });

        const main = createElement(
            "div",
            { class: "event-main" },
            [editTabs, ticketSection]
        );

        container.append(header);
        if (organizer) container.append(organizer);
        container.append(main);

        await displayTickets(
            ticketSection,
            eventData.tickets,
            eventId,
            isCreator,
            isLoggedIn
        );
    } catch (err) {
        container.replaceChildren(
            createElement(
                "h1",
                {},
                ["Failed to load event details."]
            )
        );

        Notify(
            "Failed to load event details. Please try again later.",
            { type: "error", duration: 3000 }
        );

        console.error(err);
    }
}

export { renderTicksPage };
