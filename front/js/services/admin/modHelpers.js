import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { createGroupedCard } from "./modPage.js";
import { loadModeratorApplications } from "./modapprovals.js";

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

        if (isForbiddenResponse(reports)) {
            renderNotModerator(listContainer.parentElement || document.body);
            return;
        }

        handleReportsResponse(reports, listContainer, entityPreview, summaryContainer, state, undoBtn, prevBtn, pageIndicator, nextBtn);
    } catch (err) {
        if (isForbiddenError(err)) {
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

function handleReportsResponse(reports, listContainer, entityPreview, summaryContainer, state, undoBtn, prevBtn, pageIndicator, nextBtn) {
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

function isForbiddenResponse(reports) {
    return reports && typeof reports === "object" && reports.error && /forbid/i.test(reports.error);
}

function isForbiddenError(err) {
    return err && (
        err.status === 403 ||
        (typeof err === "object" && err.error && /forbid/i.test(err.error)) ||
        (typeof err === "object" && err.message && /forbid/i.test(err.message))
    );
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
    // loadModeratorApplications(container);
}

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
    btn.addEventListener("click", handler);
    return btn;
}

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

function showTemporaryError(msg, container = document.body) {
    const errMsg = createElement("div", { class: "error" }, [msg]);
    container.appendChild(errMsg);
    setTimeout(() => errMsg.remove(), 2500);
}

function showTemporaryInfo(msg) {
    const info = createElement("div", { class: "info" }, [msg]);
    document.body.appendChild(info);
    setTimeout(() => info.remove(), 1500);
}
