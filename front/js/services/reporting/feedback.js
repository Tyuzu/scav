import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import Button from "../../components/base/Button.js";

export function userFeedbackGlobal() {
    Modal({
        title: "Your Feedback",
        size: "medium",
        closeOnOverlayClick: true,
        autofocusSelector: "#uf-type",

        content: () => {
            const typeLabel = createElement("label", { for: "uf-type" }, ["Type"]);
            const typeSelect = createElement("select", { id: "uf-type" }, [
                createElement("option", { value: "feature" }, ["Feature Request"]),
                createElement("option", { value: "bug" }, ["Bug Report"]),
                createElement("option", { value: "other" }, ["Other"])
            ]);

            const msgLabel = createElement("label", { for: "uf-message" }, ["Details"]);
            const msgBox = createElement("textarea", {
                id: "uf-message",
                rows: "6",
                placeholder: "Describe what you want added, changed, or what went wrong…"
            });

            const wrap = createElement("div", { class: "uf-wrap" }, [
                typeLabel,
                typeSelect,
                msgLabel,
                msgBox
            ]);

            return wrap;
        },

        actions: () => {
            const sendBtn = Button(
                "Submit",
                "uf-submit",
                {
                    click: async () => {
                        const kind = document.getElementById("uf-type")?.value || "";
                        const text = document.getElementById("uf-message")?.value || "";

                        if (!text.trim()) return;

                        await apiFetch(
                            "/feedback/submit",
                            "POST",
                            { type: kind, message: text },
                            {}
                        );

                        document.getElementById("uf-submit")?.dispatchEvent(
                            new Event("modal-close", { bubbles: true })
                        );
                    }
                },
                "buttonx",
                {}
            );

            const cancelBtn = Button(
                "Cancel",
                "uf-cancel",
                {
                    click: () => {
                        document.getElementById("uf-cancel")?.dispatchEvent(
                            new Event("modal-close", { bubbles: true })
                        );
                    }
                },
                "buttonx secondary",
                {}
            );

            const footer = createElement("div", { class: "uf-actions" }, [
                sendBtn,
                cancelBtn
            ]);

            // Modal listens for "modal-close" bubbling on any element inside footer
            footer.addEventListener("modal-close", () => {
                const el = document.querySelector(".modal .modal-close");
                el?.click();
            });

            return footer;
        }
    });
}
