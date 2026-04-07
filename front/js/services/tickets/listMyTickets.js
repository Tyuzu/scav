import { apiFetch } from "../../api/api.js";
import Datex from "../../components/base/Datex.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import { Button } from "../../components/base/Button.js";
import { printTicketPDF } from "./printTicket.js";

export async function listMyTickets(eventid) {
    const container = createElement("div", {}, []);

    try {
        const tickets = await apiFetch(
            `/ticket/mytickets/${eventid}`,
            "GET"
        );

        if (!tickets || tickets.length === 0) {
            container.append(
                createElement(
                    "p",
                    { style: "color:#888;font-style:italic;" },
                    ["No tickets found for this event."]
                )
            );
        } else {
            tickets.sort((a, b) => {
                const order = { Active: 0, Transferred: 1, Cancelled: 2 };
                return (order[a.status] || 9) - (order[b.status] || 9);
            });

            tickets.forEach(ticket => {
                let statusColor = "green";
                if (ticket.status === "Cancelled") {
statusColor = "red";
}
                if (ticket.status === "Transferred") {
statusColor = "orange";
}

                const actionButtons = [];

                if (!ticket.canceled) {
                    actionButtons.push(
                        Button(
                            "Print",
                            "",
                            {
                                click: () =>
                                    printTicketPDF(
                                        eventid,
                                        ticket.uniquecode
                                    )
                            },
                            "buttonx"
                        ),
                        Button(
                            "Cancel",
                            "",
                            {
                                click: async () => {
                                    if (!confirm("Cancel this ticket?")) {
return;
}

                                    try {
                                        await apiFetch(
                                            `/ticket/cancel/${eventid}`,
                                            "POST",
                                            { uniquecode: ticket.uniquecode }
                                        );
                                        listMyTickets(eventid);
                                    } catch {
                                        alert("Failed to cancel ticket.");
                                    }
                                }
                            },
                            "buttonx delete-btn"
                        ),
                        Button(
                            "Transfer",
                            "",
                            {
                                click: () =>
                                    alert("Transfer modal not yet implemented.")
                            },
                            "buttonx"
                        )
                    );
                }

                const meta = [];

                if (ticket.refundstatus) {
                    meta.push(
                        createElement(
                            "p",
                            { style: "color:#444;" },
                            [`Refund Status: ${ticket.refundstatus}`]
                        )
                    );
                }

                if (ticket.transferredto) {
                    meta.push(
                        createElement(
                            "p",
                            { style: "color:#444;" },
                            [`Transferred To: ${ticket.transferredto}`]
                        )
                    );
                }

                const ticketBox = createElement(
                    "div",
                    {
                        style: `
                            border:1px solid #ccc;
                            border-radius:8px;
                            padding:12px 14px;
                            margin-bottom:12px;
                            background:#fafafa;
                        `
                    },
                    [
                        createElement("h4", {}, [`Ticket ID: ${ticket.ticketid}`]),
                        createElement("p", {}, [`Unique Code: ${ticket.uniquecode}`]),
                        createElement("p", {}, [`Buyer: ${ticket.buyername}`]),
                        createElement("p", {}, [`Purchase Date: ${Datex(ticket.purchasedate)}`]),
                        createElement(
                            "p",
                            { style: `font-weight:bold;color:${statusColor};` },
                            [`Status: ${ticket.status}`]
                        ),
                        ...meta,
                        actionButtons.length > 0
                            ? createElement(
                                  "div",
                                  { style: "margin-top:10px;display:flex;gap:8px;" },
                                  actionButtons
                              )
                            : createElement("div", {}, [])
                    ]
                );

                container.append(ticketBox);
            });
        }
    } catch (err) {
        console.error(err);
        container.append(
            createElement(
                "p",
                { style: "color:red;" },
                ["Failed to load your tickets."]
            )
        );
    }

    Modal({
        title: "My Tickets",
        content: container,
        size: "large"
    });
}
