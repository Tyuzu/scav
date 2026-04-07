import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import { navigate } from "../../routes/index.js";
import { getState } from "../../state/state.js";
import { editItinerary } from "./itineraryEdit.js";

function clear(node) {
  while (node.firstChild) {
node.removeChild(node.firstChild);
}
}

function displayItinerary(isLoggedIn, root) {
  clear(root);

  if (!isLoggedIn) {
    root.append(
      createElement("p", {}, ["Please log in to view and manage your itineraries."])
    );
    return;
  }

  const rightPane = createElement("div", { class: "itinerary-right" }, [
    createElement("p", {}, ["Select an itinerary to see details here."])
  ]);

  const listDiv = createElement("div", {}, []);

  root.append(
    createElement("div", { class: "itinerary-layout" }, [
      createElement("div", { class: "itinerary-left" }, [
        createSearchForm(listDiv),
        Button(
          "Create Itinerary",
          "create-itinerary",
          { click: () => navigate("/create-itinerary") },
          "itinerary-create-btn"
        ),
        listDiv
      ]),
      rightPane
    ])
  );

  loadItineraries();

  /* ---------- API ---------- */

  async function loadItineraries() {
    setListMessage("Loading…");
    try {
      renderList(await apiFetch("/itineraries"));
    } catch (err) {
      setListMessage("Error loading itineraries.");
    }
  }

  async function searchItineraries(qs) {
    setListMessage("Searching…");
    try {
      renderList(await apiFetch(`/itineraries/search?${qs}`));
    } catch (err) {
      setListMessage("Error searching itineraries.");
    }
  }

  function setListMessage(msg) {
    clear(listDiv);
    listDiv.append(createElement("p", {}, [msg]));
  }

  /* ---------- Rendering ---------- */

  function renderList(items = []) {
    clear(listDiv);

    if (!items.length) {
      listDiv.append(createElement("p", {}, ["No itineraries found."]));
      return;
    }

    const ul = createElement("ul", { class: "itinerary-list" }, []);
    items.forEach(it => ul.append(createListItem(it)));
    listDiv.append(ul);
  }

  function createListItem(it = {}) {
    const isCreator = getState("user") === it.userid;

    const li = createElement("li", { class: "itinerary-list-item" }, [
      createElement("strong", {}, [it.name || "Untitled"]),
      createElement("span", {}, [` (${it.status || "Unknown"}) `])
    ]);

    li.append(
      Button("View", `view-${it.itineraryid}`, {
        click: () => openViewModal(it.itineraryid)
      }, "itinerary-btn secondary"),

      Button("Fork", `fork-${it.itineraryid}`, {
        click: () => forkItinerary(it.itineraryid)
      }, "itinerary-btn secondary")
    );

    if (isCreator) {
      li.append(
        Button("Edit", `edit-${it.itineraryid}`, {
          click: () => editItinerary(rightPane, true, it.itineraryid)
        }, "itinerary-btn"),

        Button("Delete", `del-${it.itineraryid}`, {
          click: () => deleteItinerary(it.itineraryid)
        }, "itinerary-btn danger")
      );

      if (!it.published) {
        li.append(
          Button("Publish", `pub-${it.itineraryid}`, {
            click: () => publishItinerary(it.itineraryid)
          }, "itinerary-btn success")
        );
      }
    }

    return li;
  }

  /* ---------- View ---------- */

  async function openViewModal(id) {
    const { dialog } = Modal({
      title: "Loading…",
      content: createElement("p", {}, ["Loading itinerary…"]),
      size: "large"
    });

    const body = dialog.querySelector(".modal-body");

    try {
      const it = await apiFetch(`/itineraries/all/${id}`);
      clear(body);
      body.append(renderDetails(it));
    } catch {
      clear(body);
      body.append(createElement("p", {}, ["Failed to load itinerary."]));
    }
  }

  function renderDetails(it = {}) {
    const days = it.days || [];

    const wrap = createElement("div", { class: "itinerary-container enhanced" }, [
      createElement("h2", { class: "itinerary-title" }, [it.name || "Untitled"]),
      createElement("div", { class: "itinerary-meta" }, [
        createElement("span", { class: `status ${it.status}` }, [
          `Status: ${it.status || "N/A"}`
        ]),
        createElement("span", {}, [
          `Dates: ${it.start_date || "?"} → ${it.end_date || "?"}`
        ])
      ]),
      createElement("p", { class: "itinerary-description" }, [
        it.description || "No description provided."
      ])
    ]);

    if (!days.length) {
      wrap.append(createElement("p", {}, ["No schedule available."]));
      return wrap;
    }

    days.forEach((day, i) => {
      const visits = Array.isArray(day.visits) ? [...day.visits] : [];

      const dayBlock = createElement("div", { class: "day-block" }, [
        createElement("h3", { class: "day-heading" }, [
          `Day ${i + 1} — ${day.date || "Unknown"}`
        ])
      ]);

      if (!visits.length) {
        dayBlock.append(createElement("p", {}, ["No visits."]));
        wrap.append(dayBlock);
        return;
      }

      // Sort visits by start time
      visits.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

      const timeline = createElement("div", { class: "timeline" }, []);

      visits.forEach((v, idx) => {
        const validTime =
          v.start_time &&
          v.end_time &&
          v.start_time < v.end_time;

        const visitCard = createElement(
          "div",
          {
            class: `timeline-item ${validTime ? "" : "invalid"}`
          },
          [
            createElement("div", { class: "timeline-time" }, [
              validTime
                ? `${v.start_time} – ${v.end_time}`
                : "Invalid time range"
            ]),
            createElement("div", { class: "timeline-content" }, [
              createElement("strong", {}, [
                v.location || "Unknown location"
              ])
            ])
          ]
        );

        timeline.append(visitCard);

        // Transport between visits
        const nextVisit = visits[idx + 1];
        if (nextVisit && nextVisit.transport) {
          timeline.append(
            createElement(
              "div",
              { class: "timeline-transport" },
              [`Transport: ${nextVisit.transport}`]
            )
          );
        }
      });

      dayBlock.append(timeline);
      wrap.append(dayBlock);
    });

    return wrap;
  }

  /* ---------- Mutations ---------- */

  async function deleteItinerary(id) {
    if (!confirm("Delete this itinerary?")) {
return;
}
    await apiFetch(`/itineraries/${id}`, "DELETE");
    loadItineraries();
  }

  async function forkItinerary(id) {
    await apiFetch(`/itineraries/${id}/fork`, "POST");
    loadItineraries();
  }

  async function publishItinerary(id) {
    await apiFetch(`/itineraries/${id}/publish`, "PUT");
    loadItineraries();
  }

  /* ---------- Search ---------- */

  function createSearchForm(listDiv) {
    const form = createElement("form", { class: "itinerary-search-form" }, [
      createElement("input", { name: "start_date", placeholder: "Start Date (YYYY-MM-DD)" }),
      createElement("input", { name: "location", placeholder: "Location" }),
      createElement("input", { name: "status", placeholder: "Status (Draft/Confirmed)" }),
      createElement("button", { type: "submit" }, ["Search"])
    ]);

    form.addEventListener("submit", e => {
      e.preventDefault();
      const qs = new URLSearchParams(new FormData(form)).toString();
      searchItineraries(qs);
    });

    return form;
  }
}

export { displayItinerary };
