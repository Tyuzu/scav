import { createBaito } from "../../services/baitos/create/createBaito.js";

async function CreateBaito(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createBaito(isLoggedIn, contentContainer);
}

export { CreateBaito };
