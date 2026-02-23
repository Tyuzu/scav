import { renderTicksPage } from "../../services/tickets/ticketsOnlyPage.js";

async function EventTickets(isLoggedIn, eventid, contentContainer) {
    renderTicksPage(isLoggedIn, eventid, contentContainer)
}


export { EventTickets };
