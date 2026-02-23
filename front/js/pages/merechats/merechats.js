
import { displayChats } from "../../services/merechats/merechat";

async function MeChats(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayChats(contentContainer, isLoggedIn);
}

export { MeChats };
