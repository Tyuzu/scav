import TicketCard from '../../components/ui/TicketCard.mjs';
import { Button } from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";

import { deleteTicket, editTicket } from "./editTicket.js";
import { addTicketForm } from './ticketService.js';
import { printTicket } from './printTicket.js';
import {
    verifyTicketAndShowModal,
    cancelTicket,
    transferTicket
} from "./ticketTransfer.js";
import { listMyTickets } from './listmyTickets.js';
import { showPaymentModal } from '../pay/pay.js';
import Modal from '../../components/ui/Modal.mjs';

// CRITICAL FIX: Format currency from paise to rupees
function formatCurrency(paise) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format((paise || 0) / 100);
}

/* ────────── Ticket Card ────────── */
function createTicketCard(ticket, eventId, isCreator, isLoggedIn) {
    const card = TicketCard({
        isl: isLoggedIn,
        seatstart: ticket.seatstart,
        seatend: ticket.seatend,
        creator: isCreator,
        name: ticket.name,
        price: formatCurrency(ticket.price), // CRITICAL FIX: Use proper currency formatting
        quantity: ticket.quantity,
        color: ticket.color || "#f3f3f3",
        attributes: { "data-ticket-id": ticket.ticketid },
        onClick: async () => {
            if (!isLoggedIn || isCreator) {
return;
}
          
            const quantityInput = createElement("input", {
              type: "number",
              min: 1,
              value: 1
            });
          
            const wrapper = createElement("div", { class: "modal-form-group" }, [
              createElement("label", {}, ["Quantity: ", quantityInput])
            ]);
          
            const modal = Modal({
              title: `Purchase ${ticket.name}`,
              content: wrapper,
              actions: () =>
                createElement("div", { class: "modal-actions" }, [
                  Button(
                    "Next",
                    "",
                    {
                      click: async () => {
                        const quantity = parseInt(quantityInput.value, 10);
          
                        if (
                          !Number.isInteger(quantity) ||
                          quantity < 1 ||
                          quantity > ticket.quantity
                        ) {
                          return alert(
                            `⚠️ Enter a valid quantity (1-${ticket.quantity}).`
                          );
                        }
          
                        modal.close();
          
                        try {
                          const paymentResult = await showPaymentModal({
                            paymentType: "purchase",
                            entityType: "ticket",
                            entityId: ticket.ticketid,
                            entityName: ticket.name
                          });
          
                          if (!paymentResult || paymentResult.success !== true) {
                            return alert("❌ Payment cancelled or failed.");
                          }
          
                          const resp = await apiFetch(
                            `/ticket/event/${eventId}/${ticket.ticketid}/confirm-purchase`,
                            "POST",
                            { quantity }
                          );
          
                          if (resp.success) {
                            alert("✅ Ticket purchased successfully!");
                          } else {
                            alert(resp.message || "❌ Purchase failed.");
                          }
                        } catch (err) {
                          console.error("Ticket purchase failed:", err);
                          alert(`❌ Purchase failed: ${err.message}`);
                        }
                      }
                    },
                    "buttonx"
                  ),
                  Button(
                    "Cancel",
                    "",
                    { click: () => modal.close() },
                    "buttonx"
                  )
                ])
            });
          }
          
    });

    // ── Creator Actions ──
    if (isCreator) {
        const actions = createElement("div", { class: "hflex-sb", style: "padding:0 0.5rem;" });
        actions.append(
            Button("Edit", "", { click: () => editTicket(ticket.ticketid, eventId) }, "buttonx primary"),
            Button("Delete", "", { click: () => deleteTicket(ticket.ticketid, eventId) }, "buttonx delete-btn")
        );
        card.append(actions);
    }

    return card;
}

/* ────────── Single Ticket Insert ────────── */
export function displayNewTicket(ticketData, ticketList, isCreator = false, isLoggedIn = false, eventId) {
    ticketList.append(createTicketCard(ticketData, eventId, isCreator, isLoggedIn));
}

/* ────────── Ticket List ────────── */
export function displayTickets(ticketContainer, tickets, eventId, isCreator, isLoggedIn) {
    ticketContainer.replaceChildren(createElement("h2", {}, ["Tickets"]));

    const actionsCon = createElement("div", { class: "hvflex" });

    if (!isCreator && tickets?.length > 0) {
        actionsCon.append(
            Button("Verify Ticket", "", { click: () => verifyTicketAndShowModal(eventId) }, "buttonx action-btn"),
            Button("Print Ticket", "", { click: () => printTicket(eventId) }, "buttonx action-btn"),
            Button("Cancel Ticket", "", { click: () => cancelTicket(eventId) }, "buttonx action-btn"),
            Button("Transfer Ticket", "", { click: () => transferTicket(eventId) }, "buttonx action-btn"),
            Button("My Tickets", "", { click: () => listMyTickets(eventId) }, "buttonx action-btn")
        );
    }

    const ticketListDiv = createElement("div", { class: "hvflex gap20" });

    if (isCreator) {
        ticketContainer.append(
            Button("Add Tickets", "add-ticket-btn", { click: () => addTicketForm(eventId, ticketListDiv) }, "buttonx")
        );
    }

    if (tickets?.length > 0) {
        tickets.forEach(t => ticketListDiv.append(createTicketCard(t, eventId, isCreator, isLoggedIn)));
    } else {
        ticketListDiv.append(createElement("p", {}, ["No tickets available for this event."]));
    }

    ticketContainer.append(actionsCon, ticketListDiv);
}
