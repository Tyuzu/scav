import { displayProduct } from "../../services/product/productPage.js";

async function Product(isLoggedIn, productType, productId, contentContainer) {
    contentContainer.innerHTML = '';
    displayProduct(isLoggedIn, productType, productId, contentContainer);
}

export { Product };
