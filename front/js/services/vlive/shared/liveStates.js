export const LIVE_STATE_TRANSITIONS = {
    CREATED: [
        { label: "Mark Ready", endpoint: "/ready" }
    ],
    READY: [
        { label: "Go Live", endpoint: "/start" }
    ],
    LIVE: [
        {
            label: "End Stream",
            endpoint: "/end",
            confirm: {
                title: "End Stream",
                message: "This will disconnect all viewers. Continue?"
            }
        }
    ],
    ENDED: [],
    CANCELLED: [],
    ERROR: []
};

export const TERMINAL_STATES = ["ENDED", "CANCELLED", "ERROR"];

export const isTerminalState = (state) =>
    TERMINAL_STATES.includes(state);
