import { displayMyOrders } from "../../services/cart/myOrdersPage.js";

async function MyOrders(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayMyOrders(contentContainer, isLoggedIn);
}

export { MyOrders };
