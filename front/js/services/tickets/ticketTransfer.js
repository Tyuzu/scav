import Modal from "../../components/ui/Modal.mjs";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { listMyTickets } from "./listmyTickets.js";

/* ────────── Generic Ticket Action ────────── */
const handleTicketAction = (action, eventId) => {
    const codeInput = createElement("input", {
        id: "unique-code",
        type: "text",
        required: true
    });

    const children = [
        createElement("label", { for: "unique-code" }, ["Unique Code"]),
        codeInput
    ];

    let recipientInput;
    if (action === "transfer") {
        recipientInput = createElement("input", {
            id: "recipient",
            type: "text",
            required: true
        });

        children.push(
            createElement("label", { for: "recipient" }, ["Recipient"]),
            recipientInput
        );
    }

    const submitBtn = Button(
        action.charAt(0).toUpperCase() + action.slice(1),
        "",
        {},
        "buttonx primary"
    );
    submitBtn.type = "submit";

    const form = createElement(
        "form",
        { class: "vflex gap10" },
        [...children, submitBtn]
    );

    const { close: closeForm } = Modal({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Ticket`,
        content: form
    });

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const uniquecode = codeInput.value.trim();
        if (!uniquecode) {
return;
}

        const recipient =
            action === "transfer" ? recipientInput.value.trim() : "";

        const loading = createElement("p", {}, [`${action} in progress...`]);
        const { close: closeLoading } = Modal({
            title: "Processing",
            content: loading
        });

        let success = false;

        try {
            if (action === "verify") {
                success = await verifyTicket(eventId, uniquecode);
            }
            if (action === "cancel") {
                success = await cancelTicketApi(eventId, uniquecode);
            }
            if (action === "transfer") {
                success = await transferTicketApi(eventId, uniquecode, recipient);
            }
        } catch (err) {
            console.error(err);
        }

        closeLoading();
        closeForm();

        Modal({
            title: "Result",
            content: createElement(
                "p",
                {},
                [
                    success
                        ? `Ticket ${action} successful.`
                        : `Ticket ${action} failed.`
                ]
            )
        });

        if (success && action !== "verify") {
            listMyTickets(eventId);
        }
    });
};

/* ────────── API Calls ────────── */
const verifyTicket = async (eventId, uniquecode) => {
    try {
        const res = await apiFetch(
            `/ticket/verify/${eventId}?uniqueCode=${encodeURIComponent(uniquecode)}`,
            "GET"
        );
        return !!res?.isvalid;
    } catch {
        return false;
    }
};

const cancelTicketApi = async (eventId, uniquecode) => {
    try {
        const res = await apiFetch(
            `/ticket/cancel/${eventId}`,
            "POST",
            { uniquecode }
        );
        return !!res?.success;
    } catch {
        return false;
    }
};

const transferTicketApi = async (eventId, uniquecode, recipient) => {
    try {
        const res = await apiFetch(
            `/ticket/transfer/${eventId}`,
            "POST",
            { uniquecode, recipient }
        );
        return !!res?.success;
    } catch {
        return false;
    }
};

/* ────────── Exports ────────── */
const verifyTicketAndShowModal = eventId =>
    handleTicketAction("verify", eventId);

const cancelTicket = eventId =>
    handleTicketAction("cancel", eventId);

const transferTicket = eventId =>
    handleTicketAction("transfer", eventId);

export {
    verifyTicketAndShowModal,
    cancelTicket,
    transferTicket
};
