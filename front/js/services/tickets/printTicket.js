import Modal from "../../components/ui/Modal.mjs";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";

/* ────────── Download PDF ────────── */
const printTicketPDF = async (eventId, uniqueCode) => {
    try {
        const endpoint =
            `/ticket/print/${eventId}?uniqueCode=` +
            encodeURIComponent(uniqueCode);

        const blob = await apiFetch(
            endpoint,
            "GET",
            null,
            { responseType: "blob" }
        );

        const url = URL.createObjectURL(blob);

        const link = createElement("a", {
            href: url,
            download: `ticket-${uniqueCode}.pdf`
        });

        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        return true;
    } catch (err) {
        console.error("Ticket PDF download failed:", err);
        return false;
    }
};

/* ────────── Print Ticket Flow ────────── */
const printTicket = async (eventId) => {
    const codeInput = createElement("input", {
        id: "unique-code",
        type: "text",
        required: true
    });

    const form = createElement(
        "form",
        { class: "vflex gap10" },
        [
            createElement("label", { for: "unique-code" }, ["Enter Unique Code"]),
            codeInput,
            Button("Print Ticket", "", {}, "buttonx primary")
        ]
    );

    const { close: closeFormModal } = Modal({
        title: "Print Your Ticket",
        content: form
    });

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const uniqueCode = codeInput.value.trim();
        if (!uniqueCode) {
return;
}

        const loading = createElement(
            "p",
            {},
            ["Printing your ticket..."]
        );

        const { close: closeLoading } = Modal({
            title: "Ticket Printing",
            content: loading
        });

        const success = await printTicketPDF(eventId, uniqueCode);

        closeLoading();
        closeFormModal();

        Modal({
            title: "Ticket Result",
            content: createElement(
                "p",
                {},
                [
                    success
                        ? "Your ticket has been downloaded."
                        : "Failed to generate ticket."
                ]
            )
        });
    });
};

export { printTicket, printTicketPDF };

// import Modal from '../../components/ui/Modal.mjs';
// import { apiFetch } from '../../api/api';

// const printTicketPDF = async (eventId, uniqueCode) => {
//   try {
//     const endpoint = `/ticket/print/${eventId}?uniqueCode=${encodeURIComponent(uniqueCode)}`;

//     // Use apiFetch with blob response type
//     const response = await apiFetch(endpoint, 'GET', null, { responseType: 'blob' });

//     // const blob = await response.blob();
//     const blob = response;

//     const downloadUrl = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = downloadUrl;
//     link.download = `ticket-${uniqueCode}.pdf`;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     URL.revokeObjectURL(downloadUrl);

//     return true;
//   } catch (error) {
//     console.error(`Error downloading ticket PDF:`, error);
//     return false;
//   }
// };

// const printTicket = async (eventId) => {
//   const form = document.createElement('form');
//   form.className = "vflex";

//   const codeLabel = document.createElement('label');
//   codeLabel.textContent = 'Enter Unique Code:';
//   codeLabel.setAttribute('for', 'unique-code');
//   const codeInput = document.createElement('input');
//   codeInput.type = 'text';
//   codeInput.id = 'unique-code';
//   codeInput.name = 'unique-code';
//   codeInput.required = true;

//   const submitButton = document.createElement('button');
//   submitButton.type = 'submit';
//   submitButton.textContent = 'Print Ticket';

//   form.append(codeLabel, codeInput, submitButton);

//   const { close: closeFormModal } = Modal({
//     title: 'Print Your Ticket',
//     content: form,
//   });

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const uniqueCode = codeInput.value.trim();

//     if (!uniqueCode) {
//       alert('Please enter the Unique Code.');
//       return;
//     }

//     const loadingText = document.createElement('p');
//     loadingText.textContent = 'Printing your ticket...';

//     const { close: closeLoadingModal } = Modal({
//       title: 'Ticket Printing',
//       content: loadingText,
//     });

//     const success = await printTicketPDF(eventId, uniqueCode);

//     closeLoadingModal();
//     closeFormModal();

//     const resultContent = document.createElement('div');
//     const resultText = document.createElement('p');
//     resultText.textContent = success
//       ? '✅ Your ticket has been downloaded.'
//       : '❌ Failed to generate ticket. Please try again.';
//     resultContent.appendChild(resultText);

//     Modal({
//       title: 'Ticket Result',
//       content: resultContent,
//     });
//   });
// };

// export { printTicket, printTicketPDF };
