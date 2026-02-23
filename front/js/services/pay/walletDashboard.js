import { WalletManager } from "./walletManager.js";
import { WalletTransactions } from "./walletTransactions.js";
import { WalletTransfer } from "./walletTransfer.js";
import { createElement } from "../../components/createElement.js";

export function WalletDashboard() {
    const container = createElement("div", { id: "wallet-dashboard", class: "wallet-dashboard" });

    // --- Left column: Balance + Transfer ---
    const leftCol = createElement("div", { class: "wallet-left-col" });

    const walletManagerInstance = WalletManager();
    const walletManagerWrapper = createElement("section", { class: "wallet-section wallet-balance" }, [
        walletManagerInstance.element
    ]);

    const transferWrapper = createElement("section", { class: "wallet-section wallet-transfer" }, [
        WalletTransfer({ onBalanceChange: walletManagerInstance.loadBalance })
    ]);

    leftCol.append(walletManagerWrapper, transferWrapper);

    // --- Right column: Transactions ---
    const rightCol = createElement("div", { class: "wallet-right-col" });
    const txnWrapper = createElement("section", { class: "wallet-section wallet-transactions" }, [
        WalletTransactions({ onBalanceChange: walletManagerInstance.loadBalance })
    ]);
    rightCol.append(txnWrapper);

    container.append(leftCol, rightCol);
    return container;
}
