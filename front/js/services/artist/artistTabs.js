import { SRC_URL, apiFetch } from "../../api/api.js";
import { displayMerchandise } from "../merch/merchService.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import Button from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";


export async function renderAlbumsTab(artistID, isCreator) {
    const container = createElement("div", { class: "albums-container" }, []);

    const heading = createElement("p", {}, [
        createElement("strong", {}, ["🎶 Albums"])
    ]);
    container.append(heading);

    let albums = [];
    try {
        albums = await apiFetch(`/artists/${artistID}/albums`);
    } catch {
        const msg = createElement("p", {}, ["Error loading albums."]);
        container.append(msg);
        return container;
    }

    if (!albums.length) {
        const msg = createElement("p", {}, ["No albums available."]);
        container.append(msg);
        return container;
    }

    const listWrapper = createElement("div", { class: "albums-wrapper" }, []);

    albums.forEach(a => {
        if (!a.published && !isCreator) return;

        const title = createElement("h3", {}, [a.title || ""]);
        const release = createElement("p", {}, [
            createElement("strong", {}, ["Release:"]),
            " ",
            a.releaseDate || ""
        ]);
        const desc = createElement("p", {}, [a.description || ""]);

        const block = createElement("div", { class: "album-block" }, [
            title,
            release,
            desc
        ]);

        listWrapper.append(block);
    });

    container.append(listWrapper);
    return container;
}


async function renderMerchTab(container, artistID, isCreator, isLoggedIn) {
  try {
    const response = await apiFetch(`/artists/${artistID}/merch`);
    const merchItems = response?.data ?? [];

    const holder = createElement("div", { id: "edittabs" }, []);
    container.append(holder);

    displayMerchandise(
      container,
      merchItems,
      "artist",
      artistID,
      isCreator,
      isLoggedIn
    );
  } catch {
    const msg = createElement("p", {}, ["Error loading merch."]);
    container.replaceChildren(msg);
  }
}


async function renderEventsTab(container, artistID, isCreator) {
    try {
        const events = await apiFetch(`/artists/${artistID}/events`);
        container.replaceChildren();

        if (isCreator) {
            const createEventBtn = Button("Create New Event", "", {
                click: () => openEventModal(artistID, container)
            }, "action-btn buttonx");

            const addArtistToEventBtn = Button("Add Artist to an Event", "", {
                click: () => openAddToEventModal(artistID)
            }, "action-btn buttonx");

            container.append(createEventBtn, addArtistToEventBtn);
        }

        if (!events || events.length === 0) {
            container.append(createElement("p", {}, ["No upcoming events."]));
            return;
        }

        const ul = createElement("ul", {}, []);

        events.forEach(eventx => {
            const btn = eventx.eventid
                ? Button("View Event", "", { click: () => navigate(`/event/${eventx.eventid}`) })
                : createElement("span", {}, [""]);

            const li = createElement("li", {}, [
                createElement("strong", {}, [eventx.title]),
                createElement("br"),
                `${eventx.date} at ${eventx.venue} — ${eventx.city}, ${eventx.country}`,
                createElement("br"),
                btn
            ]);

            ul.append(li);
        });

        container.append(ul);
    } catch {
        container.append(createElement("p", {}, ["Error loading events."]));
    }
}


// EVENT CREATION MODAL
function openEventModal(artistID, eventsContainer) {
    const form = createElement("form", { class: "event-form" }, []);

    const fields = [
        { type: "text", name: "title", placeholder: "Event Title", required: true },
        { type: "date", name: "date", required: true },
        { type: "text", name: "venue", placeholder: "Venue", required: true },
        { type: "text", name: "city", placeholder: "City", required: true },
        { type: "text", name: "country", placeholder: "Country", required: true },
        { type: "url", name: "ticketUrl", placeholder: "Ticket URL (optional)" }
    ];

    fields.forEach(f => {
        const input = createElement("input", {
            type: f.type,
            name: f.name,
            placeholder: f.placeholder || "",
            required: f.required || false
        });
        form.append(input);
    });

    const submitBtn = createElement("button", { type: "submit" }, ["Create Event"]);
    form.append(submitBtn);

    const { close } = Modal({
        title: "Create New Event",
        content: form,
        onClose: () => {},
        autofocusSelector: "input[name='title']"
    });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));

        try {
            await apiFetch(`/artists/${artistID}/events`, "POST", data);
            close();

            if (eventsContainer) {
                await renderEventsTab(eventsContainer, artistID, true);
            }
        } catch {
            console.error("Failed to create event");
        }
    });
}


// ADD ARTIST TO EVENT MODAL
function openAddToEventModal(artistID) {
    const form = createElement("form", { class: "event-form" }, []);

    const input = createElement("input", {
        type: "text",
        name: "eventid",
        placeholder: "Event ID",
        required: true
    });

    const submitBtn = createElement("button", { type: "submit" }, ["Add"]);
    form.append(input, submitBtn);

    const { close } = Modal({
        title: "Add Artist To Event",
        content: form,
        onClose: () => {},
        autofocusSelector: "input[name='eventid']"
    });

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const data = Object.fromEntries(new FormData(form));
        try {
            await apiFetch(`/artists/${artistID}/events/addtoevent`, "PUT", data);
            close();
        } catch {
            console.error("Error adding artist to event");
        }
    });
}


export {
    renderMerchTab,
    renderEventsTab
};
