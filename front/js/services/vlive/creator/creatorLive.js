// creator/creatorLive.js
import { liveFetch } from "../../../api/api";
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";
import { confirmModal } from "../../../components/ui/confirmModal.js";
import { LIVE_STATE_TRANSITIONS, isTerminalState } from "../shared/liveStates.js";

export async function displayCreatorLive(
    isLoggedIn,
    entityType,
    entityId,
    liveId,
    container
) {
    container.replaceChildren();

    if (!isLoggedIn) {
        container.append(createElement("p", {}, ["You must be logged in"]));
        return;
    }

    if (!liveId) {
        container.append(createElement("p", {}, ["Invalid livestream ID"]));
        return;
    }

    let pollTimer = null;
    let destroyed = false;
    let stream = null;
    let lastState = "";

    /* ================================
       HELPERS
    ================================ */

    const createBtn = (title, onClick, disabled = false) =>
        Button(title, "", disabled ? {} : { click: onClick });

    const updateText = (el, text) =>
        el.replaceChildren(String(text ?? ""));

    const formatDuration = startedAt => {
        if (!startedAt) return "00:00";
        const sec = Math.floor((Date.now() - new Date(startedAt)) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${m}:${s}`;
    };

    const stopPolling = () => {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
    };

    const fetchStream = async () => {
        try {
            return await liveFetch(`/vlive/id/${encodeURIComponent(liveId)}`);
        } catch {
            return null;
        }
    };

    /* ================================
       STATIC UI
    ================================ */

    const header = createElement("header", {}, [
        createElement("h2", {}, ["Creator Dashboard"])
    ]);

    const statusOverlay = createElement(
        "div",
        {
            style: {
                position: "absolute",
                top: "10px",
                right: "10px",
                padding: "4px 8px",
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "bold"
            }
        },
        ["Offline"]
    );

    const videoWrapper = createElement(
        "div",
        {
            style: {
                position: "relative",
                backgroundColor: "#000",
                borderRadius: "8px",
                minHeight: "240px",
                marginBottom: "12px"
            }
        },
        [statusOverlay]
    );

    const titleEl = createElement("h3", {}, [""]);
    const statusEl = createElement("p", {}, [""]);
    const healthEl = createElement("p", {}, [""]);
    const viewerEl = createElement("p", {}, [""]);
    const durationEl = createElement("p", {}, [""]);

    const titleInput = createElement("input", { value: "" });

    const saveMetaBtn = createBtn("Save Title", async () => {
        saveMetaBtn.disabled = true;
        try {
            await liveFetch(`/vlive/id/${encodeURIComponent(liveId)}`, "PUT", {
                title: titleInput.value
            });
        } catch {}
        saveMetaBtn.disabled = false;
    });

    const controls = createElement("div", {});
    const summary = createElement("div", {});
    const ingestBlock = createElement("div", {});
    const keyBlock = createElement("div", {});
    const publicBlock = createElement("div", {});

    /* ================================
       COPY BLOCK
    ================================ */

    const createCopyBlock = (label, value) =>
        createElement("div", {}, [
            createElement("p", {}, [label]),
            createElement("code", {}, [value || ""]),
            createBtn("Copy", () => navigator.clipboard.writeText(value || ""))
        ]);

    /* ================================
       CONTROLS
    ================================ */

    function rebuildControls(state) {
        controls.replaceChildren();

        const transitions = LIVE_STATE_TRANSITIONS[state] || [];

        transitions.forEach(t => {
            controls.append(
                createBtn(t.label, async () => {
                    if (t.confirm) {
                        const ok = await confirmModal({
                            title: t.confirm.title,
                            message: t.confirm.message
                        });
                        if (!ok) return;
                    }

                    try {
                        await liveFetch(
                            `/vlive/id/${encodeURIComponent(liveId)}${t.endpoint}`,
                            t.method || "POST",
                            t.body || {}
                        );
                    } catch {}
                })
            );
        });
    }

    /* ================================
       SUMMARY
    ================================ */

    function rebuildSummary() {
        summary.replaceChildren();

        if (!stream || stream.state !== "ENDED") return;

        const duration =
            stream.startedAt && stream.endedAt
                ? Math.floor(
                      (new Date(stream.endedAt) -
                          new Date(stream.startedAt)) /
                          1000
                  )
                : 0;

        summary.append(
            createElement("p", {}, [`Duration: ${duration}s`]),
            createElement("p", {}, [
                `Peak Viewers: ${stream.peakViewers || 0}`
            ]),
            createBtn("Publish VOD", async () => {
                const ok = await confirmModal({
                    title: "Publish VOD",
                    message: "Make this replay public?"
                });
                if (!ok) return;
                try {
                    await liveFetch(
                        `/vlive/id/${encodeURIComponent(
                            liveId
                        )}/vod/publish`,
                        "POST"
                    );
                } catch {}
            }),
            createBtn("Delete VOD", async () => {
                const ok = await confirmModal({
                    title: "Delete VOD",
                    message: "This cannot be undone. Continue?"
                });
                if (!ok) return;
                try {
                    await liveFetch(
                        `/vlive/id/${encodeURIComponent(liveId)}/vod`,
                        "DELETE"
                    );
                } catch {}
            })
        );
    }

    /* ================================
       POLLING
    ================================ */

    async function poll() {
        if (destroyed) return;

        const s = await fetchStream();
        if (!s) return;

        stream = s;

        updateText(titleEl, stream.title || "Untitled Stream");
        updateText(statusEl, `Status: ${stream.state}`);
        updateText(
            healthEl,
            `Ingest: ${
                stream.ingestConnected ? "Connected" : "Disconnected"
            }`
        );
        updateText(viewerEl, `Viewers: ${stream.viewerCount || 0}`);
        updateText(
            durationEl,
            `Duration: ${formatDuration(stream.startedAt)}`
        );

        statusOverlay.replaceChildren(stream.state);

        if (lastState !== stream.state) {
            lastState = stream.state;
            rebuildControls(stream.state);
            rebuildSummary();
        }

        if (stream.ingestUrl) {
            ingestBlock.replaceChildren(
                createCopyBlock("Ingest URL", stream.ingestUrl)
            );
        }

        if (stream.streamKey) {
            keyBlock.replaceChildren(
                createCopyBlock("Stream Key", stream.streamKey)
            );
        }

        publicBlock.replaceChildren(
            createCopyBlock(
                "Public URL",
                `${location.origin}/live/${stream.id}`
            )
        );

        if (isTerminalState(stream.state)) {
            stopPolling();
        }
    }

    /* ================================
       VISIBILITY
    ================================ */

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopPolling();
        else if (!pollTimer) pollTimer = setInterval(poll, 3000);
    });

    /* ================================
       INIT
    ================================ */

    stream = await fetchStream();
    if (!stream) {
        container.append(
            createElement("p", {}, ["Stream not found"])
        );
        return;
    }

    titleInput.value = stream.title || "";
    lastState = stream.state;

    rebuildControls(stream.state);
    rebuildSummary();

    pollTimer = setInterval(poll, 3000);

    /* ================================
       RENDER
    ================================ */

    container.append(
        header,
        videoWrapper,
        titleEl,
        statusEl,
        healthEl,
        viewerEl,
        durationEl,
        createElement("p", {}, ["Edit Title"]),
        titleInput,
        saveMetaBtn,
        ingestBlock,
        keyBlock,
        publicBlock,
        controls,
        summary
    );
}
