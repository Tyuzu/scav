// viewer/livePage.js
import { liveFetch } from "../../../api/api";
import { createElement } from "../../../components/createElement";

export async function displayLiveStream(isLoggedIn, liveId, container) {
    container.replaceChildren();

    let stream = null;
    let ws = null;
    let pollTimer = null;
    let destroyed = false;

    let autoScroll = true;
    let reconnectDelay = 2000;
    const MAX_CHAT_MESSAGES = 300;

    let serverOffsetMs = 0;

    /* ================================
       HELPERS
    ================================ */

    const fetchStream = async () => {
        try {
            return await liveFetch(`/vlive/id/${encodeURIComponent(liveId)}`);
        } catch {
            return null;
        }
    };

    const updateText = (el, text) =>
        el.replaceChildren(String(text ?? ""));

    const formatDuration = startedAt => {
        if (!startedAt) {
return "00:00";
}
        const now = Date.now() + serverOffsetMs;
        const sec = Math.max(0, Math.floor((now - new Date(startedAt)) / 1000));
        const m = String(Math.floor(sec / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${m}:${s}`;
    };

    const cleanup = () => {
        destroyed = true;
        if (pollTimer) {
clearInterval(pollTimer);
}
        pollTimer = null;
        try {
 ws?.close(); 
} catch {}
        document.removeEventListener("visibilitychange", visibilityHandler);
    };

    const createOverlay = (vertical, horizontal, text) =>
        createElement(
            "div",
            {
                style: {
                    position: "absolute",
                    [vertical]: "10px",
                    [horizontal]: "10px",
                    padding: "4px 8px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    zIndex: 2
                }
            },
            [document.createTextNode(text)]
        );

    /* ================================
       INITIAL FETCH
    ================================ */

    stream = await fetchStream();

    if (!stream) {
        container.append(createElement("p", {}, ["Stream not found"]));
        return;
    }

    if (stream.state !== "LIVE") {
        container.append(
            createElement("h2", {}, [stream.title || "Stream"]),
            createElement("p", {}, [`Stream is ${stream.state}`])
        );
        return;
    }

    if (stream.startedAt) {
        serverOffsetMs = new Date(stream.startedAt).getTime() - Date.now();
    }

    /* ================================
       HEADER
    ================================ */

    const header = createElement("header", {}, [
        createElement("h2", {}, [stream.title || "Live Stream"]),
        createElement("p", {}, ["Live now"])
    ]);

    /* ================================
       VIDEO SECTION
    ================================ */

    const videoWrapper = createElement(
        "div",
        {
            style: {
                position: "relative",
                backgroundColor: "#000",
                borderRadius: "8px",
                marginBottom: "12px"
            }
        }
    );

    const statusOverlay = createOverlay("top", "right", "LIVE");
    const viewerOverlay = createOverlay(
        "top",
        "left",
        `👀 ${stream.viewerCount || 0}`
    );

    const video = createElement("video", {
        controls: true,
        autoplay: true,
        playsinline: true,
        controlsList: "nodownload",
        style: { width: "100%", borderRadius: "8px" },
        src: stream.playbackUrl || ""
    });

    let retried = false;

    video.addEventListener("error", () => {
        statusOverlay.firstChild.data = "Playback error";
    });

    video.addEventListener("stalled", () => {
        statusOverlay.firstChild.data = "Reconnecting…";
        if (!retried) {
            retried = true;
            video.load();
            video.play().catch(() => {});
        }
    });

    video.addEventListener("playing", () => {
        retried = false;
        statusOverlay.firstChild.data = "LIVE";
    });

    video.play().catch(() => {
        statusOverlay.firstChild.data = "Click to play";
    });

    videoWrapper.append(video, statusOverlay, viewerOverlay);

    /* ================================
       META
    ================================ */

    const latencyEl = createElement("p", {}, ["Latency: unknown"]);
    const durationEl = createElement("p", {}, ["Duration: 00:00"]);

    /* ================================
       SHARE
    ================================ */

    const shareBlock = createElement("div", {}, [
        createElement("p", {}, ["Share"]),
        createElement("code", {}, [location.href]),
        createElement(
            "button",
            { onclick: () => navigator.clipboard.writeText(location.href) },
            ["Copy"]
        )
    ]);

    /* ================================
       CHAT
    ================================ */

    const chatSection = createElement("section", {});
    const chatStatus = createElement("p", {}, ["Chat: Connecting…"]);
    const messagesBox = createElement("div", {
        style: {
            maxHeight: "240px",
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: "6px"
        }
    });

    const input = createElement("input", {
        type: "text",
        placeholder: "Say something…"
    });

    messagesBox.addEventListener("wheel", () => (autoScroll = false));

    const scrollChat = () => {
        if (autoScroll) {
            messagesBox.scrollTop = messagesBox.scrollHeight;
        }
    };

    function connectChat() {
        if (!isLoggedIn || destroyed) {
return;
}

        const protocol = location.protocol === "https:" ? "wss" : "ws";
        ws = new WebSocket(
            `${protocol}://${location.host}/ws/v1/vlive/id/${encodeURIComponent(
                liveId
            )}/chat`
        );

        ws.addEventListener("open", () => {
            reconnectDelay = 2000;
            updateText(chatStatus, "Chat: Connected");
        });

        ws.addEventListener("close", () => {
            if (destroyed) {
return;
}
            updateText(chatStatus, "Chat: Reconnecting…");
            setTimeout(connectChat, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        });

        ws.addEventListener("message", e => {
            try {
                const msg = JSON.parse(e.data);
                const user = msg.userId || msg.user || "anon";
                const text = msg.message || "";
                messagesBox.append(
                    createElement("p", {}, [`[${user}] ${text}`])
                );
                while (
                    messagesBox.childNodes.length > MAX_CHAT_MESSAGES
                ) {
                    messagesBox.removeChild(messagesBox.firstChild);
                }
                scrollChat();
            } catch {}
        });
    }

    if (isLoggedIn) {
        input.addEventListener("keydown", e => {
            if (
                e.key === "Enter" &&
                input.value.trim() &&
                ws?.readyState === 1
            ) {
                ws.send(input.value);
                input.value = "";
            }
        });
        connectChat();
    } else {
        updateText(chatStatus, "Login to participate in chat");
        input.disabled = true;
    }

    chatSection.append(chatStatus, messagesBox, input);

    /* ================================
       POLLING
    ================================ */

    async function poll() {
        if (destroyed) {
return;
}

        const s = await fetchStream();
        if (!s) {
return;
}

        viewerOverlay.firstChild.data = `👀 ${s.viewerCount || 0}`;
        updateText(
            durationEl,
            `Duration: ${formatDuration(s.startedAt)}`
        );
        updateText(
            latencyEl,
            `Latency: ${s.latencyMode || "unknown"}`
        );

        if (s.state !== "LIVE") {
            cleanup();
            container.replaceChildren(
                createElement("h2", {}, [s.title || "Stream Ended"]),
                createElement(
                    "p",
                    {},
                    [`Stream ${s.state.toLowerCase()}`]
                ),
                s.vodUrl
                    ? createElement(
                          "a",
                          { href: s.vodUrl },
                          ["Watch Replay"]
                      )
                    : null
            );
        }
    }

    pollTimer = setInterval(poll, 3000);

    /* ================================
       VISIBILITY
    ================================ */

    function visibilityHandler() {
        if (document.hidden) {
            if (pollTimer) {
clearInterval(pollTimer);
}
        } else if (!pollTimer) {
            pollTimer = setInterval(poll, 3000);
        }
    }

    document.addEventListener("visibilitychange", visibilityHandler);

    /* ================================
       RENDER
    ================================ */

    container.append(
        header,
        videoWrapper,
        latencyEl,
        durationEl,
        shareBlock,
        chatSection
    );
}
