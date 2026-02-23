import { displayShopping } from "../../services/shopping/shopping.js";

async function Shop(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayShopping(contentContainer, isLoggedIn);
}

export { Shop };
