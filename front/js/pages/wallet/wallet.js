import { displayWallet } from "../../services/pay/walletService.js";

async function Wallet(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayWallet(isLoggedIn, contentContainer);
}

export { Wallet };
