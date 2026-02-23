import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";

let dayCount = 0;

/* ---------- helpers ---------- */

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function showFormError(form, message) {
  let box = form.querySelector(".form-error");

  if (!box) {
    box = createElement("div", { class: "form-error" }, []);
    form.prepend(box);
  }

  box.textContent = message;
}

function clearFormError(form) {
  const box = form.querySelector(".form-error");
  if (box) box.textContent = "";
}

function createInputField({ name, type, placeholder, required, id, label, value, classes }) {
  const group = createElement("div", { class: "form-group" }, []);

  if (label) {
    group.append(
      createElement("label", { for: id }, [label])
    );
  }

  const input =
    type === "textarea"
      ? createElement("textarea", { name, id }, [])
      : createElement("input", { type, name, id }, []);

  if (placeholder) input.setAttribute("placeholder", placeholder);
  if (required) input.required = true;
  if (value !== undefined) input.value = value;
  if (classes) input.setAttribute("class", classes);

  group.append(input);
  return group;
}

function createTransportDropdown(selected) {
  const group = createElement("div", { class: "form-group transport-group" }, [
    createElement("label", {}, ["Transport from previous stop"])
  ]);

  const select = createElement("select", { class: "transport-mode" }, []);

  ["airplane", "car", "train", "walking", "other"].forEach(v => {
    const opt = createElement("option", { value: v }, [v]);
    if (selected === v) opt.selected = true;
    select.append(opt);
  });

  group.append(select);
  return group;
}

/* ---------- visits ---------- */

function createVisitEntry(daySection, visit = {}) {
  const visitsContainer = daySection.querySelector(".visits-container");
  const idx = visitsContainer.children.length;

  const entry = createElement("div", {
    class: "visit-entry",
    "data-visit-index": idx
  }, []);

  if (idx > 0) {
    entry.append(createTransportDropdown(visit.transport));
  }

  entry.append(
    createInputField({
      name: "start_time",
      type: "time",
      id: `d${daySection.dataset.dayIndex}-v${idx}-st`,
      label: "Start Time",
      required: true,
      value: visit.start_time,
      classes: "start-time"
    }),
    createInputField({
      name: "end_time",
      type: "time",
      id: `d${daySection.dataset.dayIndex}-v${idx}-en`,
      label: "End Time",
      required: true,
      value: visit.end_time,
      classes: "end-time"
    }),
    createInputField({
      name: "location",
      type: "text",
      id: `d${daySection.dataset.dayIndex}-v${idx}-loc`,
      label: "Location",
      required: true,
      value: visit.location,
      classes: "visit-location"
    })
  );

  entry.append(
    Button("Remove visit", "rm-visit", {
      click: () => visitsContainer.removeChild(entry)
    }, "buttonx secondary")
  );

  visitsContainer.append(entry);
}

/* ---------- days ---------- */

function createDaySection(day = {}) {
  const idx = dayCount++;
  const dayDiv = createElement("div", {
    class: "day-section",
    "data-day-index": idx
  }, []);

  dayDiv.append(
    createElement("h3", {}, [`Day ${idx + 1}`]),
    createInputField({
      name: "dayDate",
      type: "date",
      id: `day-${idx}-date`,
      label: "Date",
      required: true,
      value: day.date,
      classes: "day-date"
    })
  );

  const visitsContainer = createElement("div", { class: "visits-container" }, []);
  dayDiv.append(visitsContainer);

  dayDiv.append(
    Button("Add visit", "add-visit", {
      click: () => createVisitEntry(dayDiv)
    }, "buttonx"),
    Button("Remove Day", "rm-day", {
      click: () => dayDiv.remove()
    }, "buttonx secondary")
  );

  if (Array.isArray(day.visits) && day.visits.length) {
    day.visits.forEach(v => createVisitEntry(dayDiv, v));
  } else {
    createVisitEntry(dayDiv);
  }

  return dayDiv;
}

/* ---------- status ---------- */

function createStatusDropdown(selected) {
  const group = createElement("div", { class: "form-group" }, [
    createElement("label", { for: "status" }, ["Status"])
  ]);

  const select = createElement("select", { id: "status", name: "status" }, []);

  ["draft", "confirmed"].forEach(v => {
    const opt = createElement("option", { value: v }, [v]);
    if (selected === v) opt.selected = true;
    select.append(opt);
  });

  group.append(select);
  return group;
}

/* ---------- payload ---------- */

function buildPayload(form, daysContainer, itineraryId) {
  const days = [];

  daysContainer.querySelectorAll(".day-section").forEach(dayDiv => {
    const date = dayDiv.querySelector(".day-date").value;
    if (!date) return;

    const visits = [];
    dayDiv.querySelectorAll(".visit-entry").forEach(v => {
      const location = v.querySelector(".visit-location").value.trim();
      const start = v.querySelector(".start-time").value;
      const end = v.querySelector(".end-time").value;

      if (!location || !start || !end) return;
      if (start >= end) return;

      const t = v.querySelector(".transport-mode");
      const visit = { location, start_time: start, end_time: end };
      if (t) visit.transport = t.value;

      visits.push(visit);
    });

    if (visits.length) days.push({ date, visits });
  });

  return {
    ...(itineraryId ? { itineraryid: itineraryId } : {}),
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    start_date: form.elements.start_date.value,
    end_date: form.elements.end_date.value,
    status: form.elements.status.value,
    days
  };
}

/* ---------- render ---------- */

export async function renderItineraryForm(container, isLoggedIn, mode = "create", itinerary) {
  clearNode(container);

  if (!isLoggedIn) {
    container.append(createElement("p", {}, ["Please log in to manage itineraries."]));
    return;
  }

  dayCount = 0;

  const form = createElement("form", { class: "create-section" }, []);

  form.append(
    createElement("h2", {}, [mode === "edit" ? "Edit Itinerary" : "Create Itinerary"]),
    createInputField({ name: "name", id: "name", type: "text", label: "Name", required: true, value: itinerary?.name }),
    createInputField({ name: "description", id: "description", type: "textarea", label: "Description", required: true, value: itinerary?.description }),
    createInputField({ name: "start_date", id: "start_date", type: "date", label: "Start Date", required: true, value: itinerary?.start_date }),
    createInputField({ name: "end_date", id: "end_date", type: "date", label: "End Date", required: true, value: itinerary?.end_date })
  );

  const daysContainer = createElement("div", { id: "daysContainer" }, []);
  form.append(daysContainer);

  form.append(
    Button("Add Day", "add-day", {
      click: () => daysContainer.append(createDaySection())
    }, "buttonx primary")
  );

  if (itinerary?.days?.length) {
    itinerary.days.forEach(d => daysContainer.append(createDaySection(d)));
  } else {
    daysContainer.append(createDaySection());
  }

  form.append(
    createStatusDropdown(itinerary?.status || "draft"),
    Button(mode === "edit" ? "Update" : "Create", "submit-it", {}, "buttonx primary")
  );

  form.addEventListener("submit", async e => {
    e.preventDefault();
    clearFormError(form);

    try {
      const payload = buildPayload(form, daysContainer, itinerary?.itineraryid);

      if (!payload.days.length) {
        showFormError(form, "At least one valid day with visits is required.");
        return;
      }

      if (payload.start_date > payload.end_date) {
        showFormError(form, "Start date cannot be after end date.");
        return;
      }

      const url = mode === "edit"
        ? `/itineraries/${itinerary.itineraryid}`
        : "/itineraries";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await apiFetch(url, method, JSON.stringify(payload));

      if (!response) {
        throw new Error("Server returned an empty response.");
      }

      navigate("/itinerary");
      // window.dispatchEvent(
      //   new CustomEvent("navigate", { detail: "/itinerary" })
      // );

    } catch (err) {
      console.error(err);
      showFormError(form, err.message || "An unexpected error occurred.");
    }
  });

  container.append(form);
}

/* ---------- wrappers ---------- */

export function createItinerary(container, isLoggedIn) {
  renderItineraryForm(container, isLoggedIn, "create");
}

export async function editItinerary(container, isLoggedIn, id) {
  clearNode(container);

  try {
    const it = await apiFetch(`/itineraries/all/${id}`);

    if (!it) {
      throw new Error("Itinerary not found.");
    }

    renderItineraryForm(container, isLoggedIn, "edit", it);

  } catch (err) {
    console.error(err);

    container.append(
      createElement("p", { class: "error-text" }, [
        "Failed to load itinerary."
      ])
    );

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: "/itinerary" })
      );
    }, 2000);
  }
}