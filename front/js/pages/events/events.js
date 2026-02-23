import { displayEvents } from "../../services/event/displayEvents.js";

async function Events(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';

    displayEvents(isLoggedIn, contentContainer)
}

export { Events };
