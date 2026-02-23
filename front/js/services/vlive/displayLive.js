// displayLive.js
import { liveFetch } from "../../api/api";
import { createElement } from "../../components/createElement";
import Button from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import Modal from "../../components/ui/Modal.mjs";

/* ======================================
   CONSTANTS / STATE MAP
====================================== */

const VLIVE_BASE = "/vlive";

export const LIVE_STATE = {
    CREATED: "CREATED",
    READY: "READY",
    LIVE: "LIVE",
    ENDED: "ENDED",
    CANCELLED: "CANCELLED",
    ERROR: "ERROR"
};

const STATE_RULES = {
    [LIVE_STATE.CREATED]: { canStart: true, isScheduled: true, isLive: false, isPast: false },
    [LIVE_STATE.READY]:   { canStart: true, isScheduled: true, isLive: false, isPast: false },
    [LIVE_STATE.LIVE]:    { canStart: false, isScheduled: false, isLive: true, isPast: false },
    [LIVE_STATE.ENDED]:   { canStart: false, isScheduled: false, isLive: false, isPast: true }
};

const getRules = s => STATE_RULES[s?.state] || {};

/* ======================================
   ROUTING
====================================== */

function goToLive({ liveId, entityType, entityId }) {
    if (!liveId) return;
    navigate(
        entityType && entityId
            ? `/live/${entityType}/${entityId}/${liveId}`
            : `/live/${liveId}`
    );
}

/* ======================================
   CONFIRM
====================================== */

function confirmAction({ title, message, confirmLabel = "Confirm", onConfirm }) {
    let modalApi;

    modalApi = Modal({
        title,
        content: () => createElement("p", {}, [message]),
        actions: () => {
            const footer = createElement("div", {});
            footer.append(
                Button("Cancel", "", { click: () => modalApi.close() }),
                Button(confirmLabel, "", {
                    click: async () => {
                        try { await onConfirm(); } catch {}
                        modalApi.close();
                    }
                })
            );
            return footer;
        }
    });
}

/* ======================================
   MAIN
====================================== */

export async function displayLive(container, entityType, entityId, isCreator = false) {
    container.replaceChildren();

    const state = {
        view: "grid",
        streams: [],
        cardCache: { live: [], scheduled: [], past: [] }
    };

    const loadingEl = createElement("p", {}, ["Loading livestreams..."]);
    container.append(loadingEl);

    try {
        const res = await liveFetch(
            `${VLIVE_BASE}?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
        );
        state.streams = Array.isArray(res) ? res : [];
    } catch {
        container.replaceChildren(
            createElement("p", {}, ["Failed to load livestreams"]),
            Button("Retry", "", {
                click: () => displayLive(container, entityType, entityId, isCreator)
            })
        );
        return;
    }

    container.replaceChildren();

    if (isCreator) {
        container.append(renderCreatorControls(entityType, entityId, container));
    }

    if (!state.streams.length) {
        container.append(
            createElement("p", {}, [
                isCreator
                    ? "No livestreams yet. Go live or schedule one."
                    : "No livestreams available."
            ])
        );
        return;
    }

    const viewToggle = createElement("div", {});
    const contentWrapper = createElement("div", { "data-view": state.view });

    viewToggle.append(
        Button("Grid", "", { click: () => switchView("grid", state, contentWrapper) }),
        Button("List", "", { click: () => switchView("list", state, contentWrapper) })
    );

    container.append(viewToggle, contentWrapper);

    buildCardCache(state, entityType, entityId, container);
    renderGroups(state, contentWrapper);
}

/* ======================================
   CREATOR BUTTONS
====================================== */

function renderCreatorControls(entityType, entityId, container) {
    const controls = createElement("div", {});
    controls.append(
        Button("Go Live", "", { click: () => openGoLiveModal(entityType, entityId) }),
        Button("Schedule Live", "", {
            click: () => openScheduleModal(entityType, entityId, container)
        })
    );
    return controls;
}

/* ======================================
   CARD CACHE
====================================== */

function buildCardCache(state, entityType, entityId, container) {
    state.cardCache = { live: [], scheduled: [], past: [] };

    state.streams.forEach(stream => {
        const rules = getRules(stream);
        const card = renderStreamCard(stream, entityType, entityId, container);

        if (rules.isLive) state.cardCache.live.push(card);
        else if (rules.isScheduled) state.cardCache.scheduled.push(card);
        else if (rules.isPast) state.cardCache.past.push(card);
    });
}

/* ======================================
   RENDER GROUPS
====================================== */

function renderGroups(state, wrapper) {
    wrapper.replaceChildren();

    [
        { key: "live", title: "Live Now" },
        { key: "scheduled", title: "Scheduled" },
        { key: "past", title: "Past Streams" }
    ].forEach(({ key, title }) => {
        const cards = state.cardCache[key];
        if (!cards.length) return;

        wrapper.append(
            createElement("section", {}, [
                createElement("h2", {}, [title]),
                ...cards
            ])
        );
    });
}

/* ======================================
   VIEW SWITCH
====================================== */

function switchView(view, state, wrapper) {
    if (state.view === view) return;
    state.view = view;
    wrapper.setAttribute("data-view", view);
}

/* ======================================
   CARD
====================================== */

function renderStreamCard(stream, entityType, entityId, container) {
    const rules = getRules(stream);
    const card = createElement("div", {});

    const title = createElement("h3", {}, [stream.title || "Untitled Stream"]);
    const meta = createElement("p", {}, [getStreamMeta(stream)]);

    const actions = [
        Button(
            rules.isLive ? "Watch" : "View",
            "",
            { click: () => goToLive({ liveId: stream.id, entityType, entityId }) }
        )
    ];

    if (rules.canStart) {
        actions.push(
            Button("Go Live Now", "", {
                click: async () => {
                    await liveFetch(
                        `${VLIVE_BASE}/id/${encodeURIComponent(stream.id)}/start`,
                        "POST"
                    );
                    goToLive({ liveId: stream.id, entityType, entityId });
                }
            })
        );
    }

    if (rules.isLive) {
        actions.push(
            Button("End Stream", "", {
                click: () =>
                    confirmAction({
                        title: "End Stream",
                        message: "Ending this stream will disconnect all viewers.",
                        confirmLabel: "End Stream",
                        onConfirm: async () => {
                            await liveFetch(
                                `${VLIVE_BASE}/id/${encodeURIComponent(stream.id)}/end`,
                                "POST"
                            );
                            displayLive(container, entityType, entityId, true);
                        }
                    })
            })
        );
    }

    card.append(title, meta, ...actions);
    return card;
}

/* ======================================
   META
====================================== */

function getStreamMeta(stream) {
    const rules = getRules(stream);
    if (rules.isLive) return `LIVE · Viewers: ${stream.viewerCount || 0}`;
    if (rules.isScheduled && stream.scheduledAt)
        return `Starts: ${new Date(stream.scheduledAt).toLocaleString()}`;
    if (rules.isPast && stream.endedAt)
        return `Ended: ${new Date(stream.endedAt).toLocaleString()}`;
    return "";
}

/* ======================================
   MODALS
====================================== */

function openGoLiveModal(entityType, entityId) {
    let titleInput;
    let errorEl;
    let modalApi;

    modalApi = Modal({
        title: "Go Live",
        content: () => {
            titleInput = createElement("input", { placeholder: "Stream title" });
            errorEl = createElement("p", {}, []);
            return createElement("div", {}, [
                createElement("p", {}, ["Enter a title for your live stream"]),
                titleInput,
                errorEl
            ]);
        },
        actions: () => {
            const footer = createElement("div", {});
            footer.append(
                Button("Cancel", "", { click: () => modalApi.close() }),
                Button("Create", "", {
                    click: async e => {
                        if (!titleInput.value.trim()) {
                            errorEl.replaceChildren("Title is required");
                            return;
                        }

                        const btn = e.currentTarget;
                        btn.disabled = true;

                        try {
                            const res = await liveFetch(VLIVE_BASE, "POST", {
                                entityType,
                                entityId,
                                title: titleInput.value.trim(),
                                isPublic: true
                            });

                            if (res?.id) {
                                modalApi.close();
                                goToLive({ liveId: res.id, entityType, entityId });
                            }
                        } catch {}

                        btn.disabled = false;
                    }
                })
            );
            return footer;
        }
    });
}

function openScheduleModal(entityType, entityId, container) {
    let titleInput;
    let timeInput;
    let errorEl;
    let modalApi;

    modalApi = Modal({
        title: "Schedule Live",
        content: () => {
            titleInput = createElement("input", { placeholder: "Stream title" });
            timeInput = createElement("input", { type: "datetime-local" });
            errorEl = createElement("p", {}, []);
            return createElement("div", {}, [titleInput, timeInput, errorEl]);
        },
        actions: () => {
            const footer = createElement("div", {});
            footer.append(
                Button("Cancel", "", { click: () => modalApi.close() }),
                Button("Schedule", "", {
                    click: async () => {
                        if (!titleInput.value.trim() || !timeInput.value) {
                            errorEl.replaceChildren("All fields required");
                            return;
                        }

                        await liveFetch(VLIVE_BASE, "POST", {
                            entityType,
                            entityId,
                            title: titleInput.value.trim(),
                            scheduledAt: new Date(timeInput.value).toISOString()
                        });

                        modalApi.close();
                        displayLive(container, entityType, entityId, true);
                    }
                })
            );
            return footer;
        }
    });
}
