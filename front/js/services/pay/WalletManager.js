import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Notify from "../../components/ui/Notify.mjs";

export function WalletManager() {
    const balanceEl = createElement("div", { id: "wallet-balance", class: "balance-display" });

    const amountInput = createElement("input", {
        type: "number",
        id: "topup-amount",
        placeholder: "Enter amount",
        min: "1",
        step: "0.01"
    });

    const methodSelect = createElement("select", { id: "topup-method" }, [
        createElement("option", { value: "wallet" }, ["Wallet"]),
        createElement("option", { value: "card" }, ["Card"]),
        createElement("option", { value: "upi" }, ["UPI"])
    ]);

    const topupBtn = Button("Top Up", "topup-btn", {
        click: async () => {
            const amount = parseFloat(amountInput.value);
            const method = methodSelect.value;

            if (!amount || amount <= 0) {
                return Notify("Enter a valid amount", { type: "warning" });
            }

            topupBtn.disabled = true;
            try {
                const idempotencyKey = uuidv4();
                const res = await apiFetch("/wallet/topup", "POST", { amount, method }, {
                    headers: { "Idempotency-Key": idempotencyKey }
                });

                if (res?.success) {
                    Notify(res.message || "Top-up successful", { type: "success" });
                    await loadBalance();
                    amountInput.value = "";
                } else {
                    Notify(res?.message || "Top-up failed", { type: "error" });
                }
            } catch (err) {
                console.error(err);
                Notify("Top-up failed due to server error", { type: "error" });
            } finally {
                topupBtn.disabled = false;
            }
        }
    });

    async function loadBalance() {
        try {
            const res = await apiFetch("/wallet/balance");
            if (res && res.balance !== undefined) {
                balanceEl.textContent = "Wallet Balance: ₹" + res.balance.toFixed(2);
            } else {
                balanceEl.textContent = "Error fetching balance";
            }
        } catch (err) {
            console.error(err);
            balanceEl.textContent = "Error fetching balance";
        }
    }

    loadBalance();

    return {
        element: createElement("div", { id: "wallet-manager", class: "wallet-card" }, [
            createElement("h3", { class: "wallet-section-title" }, ["Balance"]),
            balanceEl,
            createElement("div", { class: "wallet-form" }, [
                amountInput,
                methodSelect,
                topupBtn
            ])
        ]),
        loadBalance
    };
}
