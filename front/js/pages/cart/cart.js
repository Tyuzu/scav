import { displayCart } from "../../services/cart/cartPage.js";

async function Cart(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayCart(contentContainer, isLoggedIn);
}

export { Cart };
