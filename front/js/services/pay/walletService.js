import { WalletDashboard } from "./walletDashboard";

export function displayWallet(isLoggedIn, contentContainer){
    contentContainer.replaceChildren();
    contentContainer.appendChild(WalletDashboard());
}