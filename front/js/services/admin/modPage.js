import { apiFetch } from "../../api/api.js";
import Datex from "../../components/base/Datex.js";
import { createElement } from "../../components/createElement.js";
import { debounce } from "../../utils/deutils.js";

/*
  Streamlined moderator panel module.
  Exports:
    - displayModerator(container, isLoggedIn)
    - createGroupedCard(...)
    - fetchAndRenderReports(...)
    - createUndoButton(...)
    - createFilters()
    - createPagination()
    - createActionButton(label, handler)
*/

export async function displayModerator(contentx, isLoggedIn) {
    contentx.replaceChildren();
    const container = createElement("div", { class: "moderatorpage" });
    contentx.appendChild(container);

    if (!isLoggedIn) {
        container.appendChild(createElement("p", {}, ["Moderator access only. Please log in."]));
        return;
    }

    // initial UI state
    const state = {
        LIMIT: 10,
        currentPage: 0,
        lastAction: null,
        totalFetched: 0,
        isLoading: false,
        DEBOUNCE_DELAY: 300,
    };

    buildModeratorUI(container, state);
}

function buildModeratorUI(container, state) {
    container.replaceChildren();

    // header
    const header = createElement("div", { class: "moderator-header" });
    const title = createElement("h2", {}, ["Reported Content"]);
    const undoBtn = createUndoButton(state, () => refresh());
    header.append(title, undoBtn);

    // filters
    const filtersWrapper = createElement("div", { class: "moderator-filters-wrapper" });
    const filters = createFilters();
    filtersWrapper.append(filters.wrapper);

    // main content + preview
    const summary = createElement("div", { class: "moderator-summary" });
    const { wrapper, listContainer, entityPreview } = createReportListUI();

    // footer / pagination
    const footer = createElement("div", { class: "moderator-footer" });
    const { pagination, prevBtn, pageIndicator, nextBtn } = createPagination();
    footer.append(summary, pagination);

    // assemble
    container.append(header, filtersWrapper, wrapper, footer);

    // refresh logic
    const refresh = () =>
        fetchAndRenderReports(listContainer, entityPreview, summary, filters, state, undoBtn, prevBtn, pageIndicator, nextBtn);

    const debouncedFetch = debounce(() => {
        state.currentPage = 0;
        refresh();
    }, state.DEBOUNCE_DELAY);

    attachFilterListeners(filters, debouncedFetch);
    attachPaginationListeners(state, prevBtn, nextBtn, refresh);

    refresh();
}

function createReportListUI() {
    const wrapper = createElement("div", { class: "moderator-main" });
    const listContainer = createElement("div", { class: "moderator-reported-list" });
    const entityPreview = createElement("div", { class: "moderator-entity-preview" }, ["Select a report to preview its content."]);
    wrapper.append(listContainer, entityPreview);
    return { wrapper, listContainer, entityPreview };
}

function attachFilterListeners(filters, handler) {
    const statusSelect = filters.status.querySelector("select");
    const typeSelect = filters.type.querySelector("select");
    const reasonSelect = filters.reason.querySelector("select");

    statusSelect.addEventListener("change", handler);
    typeSelect.addEventListener("change", handler);
    reasonSelect.addEventListener("change", handler);
    filters.reportedBy.addEventListener("input", debounce(handler, 300));
}

function attachPaginationListeners(state, prevBtn, nextBtn, refresh) {
    prevBtn.addEventListener("click", () => {
        if (state.currentPage > 0) {
            state.currentPage--;
            refresh();
        }
    });
    nextBtn.addEventListener("click", () => {
        if (state.totalFetched === state.LIMIT) {
            state.currentPage++;
            refresh();
        }
    });
}

/* --------------------------
   Shared utilities (single copy)
   -------------------------- */
function isForbidden(obj) {
    return obj && (
        obj.status === 403 ||
        (typeof obj === "object" && obj.error && /forbid/i.test(obj.error)) ||
        (typeof obj === "object" && obj.message && /forbid/i.test(obj.message))
    );
}

function showTemporaryError(msg, container = document.body) {
    const errMsg = createElement("div", { class: "error" }, [msg]);
    container.appendChild(errMsg);
    setTimeout(() => errMsg.remove(), 2500);
}

function showTemporaryInfo(msg, container = document.body) {
    const info = createElement("div", { class: "info" }, [msg]);
    container.appendChild(info);
    setTimeout(() => info.remove(), 1500);
}

function renderNotModerator(container) {
    container.replaceChildren();
    const wrapper = createElement("div", { class: "not-moderator" });
    wrapper.append(createElement("p", {}, ["You are not a moderator."]));

    const form = createElement("form", { class: "moderator-apply-form" });
    const userIdInput = createElement("input", {
        type: "text",
        name: "userId",
        placeholder: "Your user ID",
        style: "display:block;margin:0.5rem 0;"
    });

    const reasonInput = createElement("textarea", {
        name: "reason",
        placeholder: "Why do you want to be a moderator?",
        rows: 3,
        style: "display:block;margin:0.5rem 0;"
    });

    const submitBtn = createActionButton("Apply", async (e) => {
        e && e.preventDefault && e.preventDefault();
        submitBtn.disabled = true;

        const userId = userIdInput.value.trim();
        const reason = reasonInput.value.trim();
        if (!userId || !reason) {
            submitBtn.disabled = false;
            showTemporaryError("Both fields are required.", wrapper);
            return;
        }
        try {
            await apiFetch("/moderator/apply", "POST", { userId, reason });
            wrapper.replaceChildren(createElement("p", {}, ["Application submitted. You will be notified by email."]));
        } catch (err) {
            console.error("Apply failed:", err);
            showTemporaryError("Failed to submit application.", wrapper);
            submitBtn.disabled = false;
        }
    });

    const note = createElement("div", {
        class: "apply-note",
        style: "margin-top:0.5rem;color:#666;"
    }, ["Your application will be reviewed by an administrator."]);

    form.append(userIdInput, reasonInput, submitBtn);
    wrapper.append(form, note);
    container.appendChild(wrapper);
}

/* --------------------------
   Grouped card and report item
   -------------------------- */
export function createGroupedCard(reports, entityPreview, state, undoBtn, refreshFn) {
    const container = createElement("div", { class: "report-card" });
    const first = reports[0];
    const groupStatus = first.status;

    const header = createElement("div", { class: `report-header status-${groupStatus}` });
    const typeSpan = createElement("span", { class: "report-type" }, [`Type: ${first.targetType}`]);

    const earliest = reports.reduce((min, r) =>
        new Date(r.createdAt) < new Date(min.createdAt) ? r : min
        , reports[0]);

    const dateSpan = createElement("span", { class: "report-date" }, [
        // `First Reported: ${new Date(earliest.createdAt).toLocaleString()}`
        `First Reported: ${Datex(earliest.createdAt)}`
    ]);
    const countSpan = createElement("span", { class: "report-count" }, [`Reports: ${reports.length}`]);

    const expandedSection = createElement("div", { class: "report-expanded", style: "display:none;", "data-hidden": "true" });

    const toggleBtn = createActionButton("Expand", () => {
        const isHidden = expandedSection.getAttribute("data-hidden") === "true";
        expandedSection.style.display = isHidden ? "" : "none";
        expandedSection.setAttribute("data-hidden", (!isHidden).toString());
        toggleBtn.replaceChildren(isHidden ? "Collapse" : "Expand");
    });

    const viewBtn = createActionButton("View", () => {
        entityPreview.replaceChildren();
        handleView(first, entityPreview);
    });

    const deleteBtn = createActionButton("Delete Content", async (e) => {
        e && e.preventDefault && e.preventDefault();
        e && e.stopPropagation && e.stopPropagation();

        if (!confirm("Soft-delete this content? It will be hidden from users but kept for appeals/audit.")) return;

        try {
            await apiFetch(`/moderator/delete/${first.targetType}/${first.targetId}`, "PUT", {});
            if (typeof refreshFn === "function") refreshFn();
            showTemporaryInfo("Content hidden (soft-delete).");
        } catch (err) {
            console.error("Soft-delete failed:", err);
            showTemporaryError("Failed to delete content.");
        }
    });

    header.append(typeSpan, dateSpan, countSpan, toggleBtn, viewBtn, deleteBtn);

    reports.forEach((report) => {
        expandedSection.appendChild(createReportItem(report, state, undoBtn, refreshFn));
    });

    container.append(header, expandedSection);
    return container;
}

function createReportItem(report, state, undoBtn, refreshFn) {
    const item = createElement("div", { class: "report-item" });

    const fields = [
        ["Reason", report.reason],
        ["User Notes", report.notes || "(none)"],
        ["Reported ID", report.targetId],
        ["Parent", report.parentType && report.parentId ? `${report.parentType} → ${report.parentId}` : "(none)"],
        ["Status", report.status, { class: `status-text status-${report.status}` }],
        ["Reviewed By", report.reviewedBy || "(none)"],
        ["Moderator Notes", report.reviewNotes || "(none)"],
        // ["Reported At", new Date(report.createdAt).toLocaleString()],
        ["Reported At", Datex(report.createdAt)],
    ];

    fields.forEach(([label, value, attrs]) => {
        const p = createElement("p", attrs || {}, [`${label}: ${value}`]);
        item.appendChild(p);
    });

    const notifySpan = createElement("span",
        { class: report.notified ? "notified-yes" : "notified-pending" },
        [report.notified ? "Reporter Notified" : "Notification Pending"]
    );

    const statusSelect = createElement("select");
    ["pending", "reviewed", "resolved", "rejected"].forEach((s) => {
        const opt = createElement("option", { value: s }, [s]);
        if (report.status === s) opt.setAttribute("selected", "selected");
        statusSelect.appendChild(opt);
    });

    const reviewTextarea = createElement("textarea", { rows: 2, placeholder: "Moderator notes…" });
    reviewTextarea.value = report.reviewNotes || "";

    const saveBtn = createActionButton("Save", async () => {
        const newStatus = statusSelect.value;
        const newNotes = reviewTextarea.value.trim();

        if (newStatus === report.status && newNotes === (report.reviewNotes || "")) return;
        if (!confirm(`Update this report to status "${newStatus}"?`)) return;

        state.lastAction = {
            reportId: report.id,
            prevPayload: {
                status: report.status,
                reviewedBy: report.reviewedBy || "",
                reviewNotes: report.reviewNotes || "",
            },
        };
        undoBtn.disabled = false;

        try {
            await apiFetch(`/report/${report.id}`, "PUT", {
                status: newStatus,
                reviewedBy: "moderator",
                reviewNotes: newNotes,
            });
            if (typeof refreshFn === "function") refreshFn();
            showTemporaryInfo("Report updated.");
        } catch (err) {
            console.error("Failed to update report:", err);
            showTemporaryError("Failed to update this report.");
        }
    });

    const updateWrapper = createElement("div", { class: "update-wrapper" }, [
        statusSelect, reviewTextarea, saveBtn
    ]);

    item.append(notifySpan, updateWrapper);
    return item;
}

function handleView(report, entityPreview) {
    if (report.parentType && report.parentId) {
        loadReportedEntity(report.parentType, report.parentId, "Parent", entityPreview);
    }
    loadReportedEntity(report.targetType, report.targetId, "Reported", entityPreview);
}

async function loadReportedEntity(type, id, label, entityPreview) {
    const section = createElement("div", { class: "entity-section" }, [`${label} (${type}) loading…`]);
    entityPreview.appendChild(section);

    const endpoint = getEntityEndpoint(type, id);
    if (!endpoint) {
        section.replaceChildren(createElement("div", {}, [`${label}: Unknown content type.`]));
        return;
    }

    try {
        const entity = await apiFetch(endpoint);
        section.replaceChildren(
            createElement("h4", {}, [`${label}: ${type.toUpperCase()} Preview`]),
            createElement("pre", {}, [JSON.stringify(entity, null, 2)])
        );
    } catch (err) {
        console.error(`Failed to load ${label}:`, err);
        section.replaceChildren(createElement("div", {}, [`${label}: Failed to load content.`]));
    }
}

function getEntityEndpoint(type, id) {
    switch (type) {
        case "post": return `/feed/post/${id}`;
        case "place": return `/place/${id}`;
        case "comment": return `/comments/${id}`;
        case "event": return `/events/event/${id}`;
        default: return null;
    }
}

/* --------------------------
   Fetch & render reports (helpers)
   -------------------------- */
export async function fetchAndRenderReports(listContainer, entityPreview, summaryContainer, filters, state, undoBtn, prevBtn, pageIndicator, nextBtn) {
    if (state.isLoading) return;
    state.isLoading = true;

    resetUI(listContainer, entityPreview, summaryContainer, pageIndicator, state);
    listContainer.appendChild(createElement("div", { class: "spinner" }));

    const params = buildQueryString({
        status: filters.status.querySelector("select").value,
        targetType: filters.type.querySelector("select").value,
        reason: filters.reason.querySelector("select").value,
        reportedBy: filters.reportedBy.value.trim(),
        limit: state.LIMIT,
        offset: state.currentPage * state.LIMIT,
    });

    try {
        const reports = await apiFetch(`/moderator/reports?${params}`);

        if (isForbidden(reports)) {
            renderNotModerator(listContainer.parentElement || document.body);
            return;
        }

        handleReportsResponse(reports, listContainer, entityPreview, summaryContainer, state, undoBtn, prevBtn, pageIndicator, nextBtn, filters);
    } catch (err) {
        if (isForbidden(err)) {
            renderNotModerator(listContainer.parentElement || document.body);
        } else {
            console.error("Failed to load reports:", err);
            listContainer.replaceChildren(createElement("p", {}, ["Failed to load reports. Please try again."]));
            nextBtn.disabled = false;
            prevBtn.disabled = state.currentPage === 0;
        }
    } finally {
        state.isLoading = false;
    }
}

function resetUI(listContainer, entityPreview, summaryContainer, pageIndicator, state) {
    listContainer.replaceChildren();
    entityPreview.replaceChildren(createElement("div", {}, ["Select a report to preview its content."]));
    summaryContainer.replaceChildren();
    pageIndicator.replaceChildren([`Page ${state.currentPage + 1}`]);
}

function handleReportsResponse(reports, listContainer, entityPreview, summaryContainer, state, undoBtn, prevBtn, pageIndicator, nextBtn, filters) {
    state.totalFetched = Array.isArray(reports) ? reports.length : 0;
    nextBtn.disabled = state.totalFetched < state.LIMIT;
    prevBtn.disabled = state.currentPage === 0;

    listContainer.replaceChildren();

    if (!reports || reports.length === 0) {
        listContainer.appendChild(createElement("p", {}, ["No reports found for these filters."]));
        updateSummary({}, summaryContainer);
        return;
    }

    const grouped = groupReports(reports);

    Object.values(grouped).forEach((group) => {
        const card = createGroupedCard(group, entityPreview, state, undoBtn, () =>
            fetchAndRenderReports(listContainer, entityPreview, summaryContainer, filters, state, undoBtn, prevBtn, pageIndicator, nextBtn)
        );
        listContainer.appendChild(card);
    });

    updateSummary(grouped, summaryContainer);
}

function groupReports(reports) {
    return reports.reduce((acc, r) => {
        const key = `${r.targetType}:${r.targetId}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {});
}

/* --------------------------
   UI pieces: undo, filters, pagination, buttons
   -------------------------- */
export function createUndoButton(state, refreshFn) {
    const btn = createActionButton("Undo Last", async () => {
        if (!state.lastAction) {
            showTemporaryInfo("No action to undo.");
            return;
        }
        try {
            await apiFetch(`/report/${state.lastAction.reportId}`, "PUT", state.lastAction.prevPayload);
            state.lastAction = null;
            btn.disabled = true;
            if (typeof refreshFn === "function") refreshFn();
            showTemporaryInfo("Undo successful.");
        } catch (e) {
            console.error("Undo failed:", e);
            showTemporaryError("Failed to undo last action.");
        }
    });
    btn.disabled = true;
    return btn;
}

export function createFilters() {
    const wrapper = createElement("div", { class: "moderator-filters" });
    const status = createDropdown("Status", ["all", "pending", "reviewed", "resolved", "rejected"]);
    const type = createDropdown("Type", ["all", "post", "comment", "event", "place"]);
    const reason = createDropdown("Reason", ["all", "Spam", "Harassment", "Inappropriate", "Other"]);
    const reportedBy = createElement("input", {
        type: "text",
        placeholder: "Filter by Reporter ID",
        class: "filter-input",
        style: "margin:0 1rem 0 0;"
    });
    wrapper.append(status, type, reason, reportedBy);
    return { wrapper, status, type, reason, reportedBy };
}

export function createPagination() {
    const pagination = createElement("div", { class: "pagination-controls" });
    const prevBtn = createActionButton("Previous", () => {});
    const pageIndicator = createElement("span", { class: "page-indicator", style: "margin:0 1rem;" }, ["Page 1"]);
    const nextBtn = createActionButton("Next", () => {});
    pagination.append(prevBtn, pageIndicator, nextBtn);
    return { pagination, prevBtn, pageIndicator, nextBtn };
}

function updateSummary(grouped, summaryContainer) {
    const keys = Object.keys(grouped || {});
    const totalEntities = keys.length;
    const statusCounts = { pending: 0, reviewed: 0, resolved: 0, rejected: 0 };

    keys.forEach((k) => {
        const group = grouped[k];
        if (!group || group.length === 0) return;
        const firstStatus = group[0].status;
        if (statusCounts[firstStatus] !== undefined) statusCounts[firstStatus]++;
    });

    summaryContainer.replaceChildren();
    const row = createElement("div");
    row.append(
        createElement("strong", {}, ["Total Entities Reported: "]),
        createElement("span", {}, [`${totalEntities} `]),
        createElement("span", {}, [" | "]),
        createElement("strong", {}, ["Pending: "]),
        createElement("span", {}, [`${statusCounts.pending} `]),
        createElement("span", {}, [" | "]),
        createElement("strong", {}, ["Reviewed: "]),
        createElement("span", {}, [`${statusCounts.reviewed} `]),
        createElement("span", {}, [" | "]),
        createElement("strong", {}, ["Resolved: "]),
        createElement("span", {}, [`${statusCounts.resolved} `]),
        createElement("span", {}, [" | "]),
        createElement("strong", {}, ["Rejected: "]),
        createElement("span", {}, [`${statusCounts.rejected}`])
    );
    summaryContainer.appendChild(row);
}

function createDropdown(labelText, options) {
    const wrapper = createElement("div", { class: "filter-wrapper" });
    const label = createElement("label", { style: "margin-right:0.5rem;" }, [labelText]);
    const select = createElement("select", { style: "margin-right:1rem;" });
    options.forEach((val) => select.appendChild(createElement("option", { value: val }, [val])));
    wrapper.append(label, select);
    return wrapper;
}

export function createActionButton(label, handler) {
    const btn = createElement("button", { class: "moderator-btn", style: "margin:0 0.5rem;" }, [label]);
    btn.addEventListener("click", (e) => {
        // allow handler to optionally use event
        try { handler(e); } catch (err) { console.error("Action handler error:", err); }
    });
    return btn;
}

/* --------------------------
   Helpers
   -------------------------- */
function buildQueryString(paramsObj) {
    const p = new URLSearchParams();
    Object.keys(paramsObj).forEach((key) => {
        const val = paramsObj[key];
        if (val !== undefined && val !== null && val !== "" && val !== "all") {
            p.append(key, val);
        }
    });
    return p.toString();
}
