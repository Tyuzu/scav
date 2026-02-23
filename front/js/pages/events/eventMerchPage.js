import { renderMerchPage } from "../../services/tickets/merchOnlyPage.js";

async function EventMerch(isLoggedIn, eventid, contentContainer) {
    renderMerchPage(isLoggedIn, eventid, contentContainer)
}


export { EventMerch };
