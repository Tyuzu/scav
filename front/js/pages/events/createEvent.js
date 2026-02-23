import { createEvent } from "../../services/event/creadit.js";

async function CreateEvent(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createEvent(isLoggedIn, contentContainer);
}

export { CreateEvent };
