import { displayModerator } from "../../services/admin/modPage.js";

async function Admin(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayModerator(contentContainer, isLoggedIn);
}

export { Admin };
