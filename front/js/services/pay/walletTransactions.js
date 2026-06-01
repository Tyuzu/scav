import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";

// Format currency: convert paise to rupees for display
function formatCurrency(paise) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format((paise || 0) / 100);
}

export function WalletTransactions({ onBalanceChange }) {
    const container = createElement(
        "div",
        { id: "wallet-transactions", class: "wallet-card" },
        [
            createElement(
                "h3",
                { class: "wallet-section-title" },
                ["Transactions"]
            )
        ]
    );

    let skip = 0;
    const limit = 10;

    function renderStatusBadge(state = "") {
        const classes = {
            initiated: "badge-pending",
            pending: "badge-pending",
            success: "badge-success",
            failed: "badge-failed",
            reversed: "badge-reversed"
        };

        return createElement(
            "span",
            {
                class: `txn-badge ${classes[String(state).toLowerCase()] || ""}`
            },
            [String(state).toUpperCase()]
        );
    }

    async function loadTransactions() {
        container
            .querySelectorAll(".load-more, .txn-error")
            .forEach((el) => el.remove());

        try {
            const res = await apiFetch(
                `/wallet/transactions?skip=${skip}&limit=${limit}`
            );

            const transactions = Array.isArray(res)
                ? res
                : res?.transactions;

            if (!Array.isArray(transactions)) {
                container.appendChild(
                    createElement(
                        "div",
                        { class: "txn-error" },
                        ["Error loading transactions"]
                    )
                );
                return;
            }

            transactions.forEach((txn) => {
                const typeLabel =
                    txn.type === "topup"
                        ? "Top-up"
                        : txn.type === "payment"
                            ? "Payment"
                            : String(txn.type || "").toUpperCase();

                const typeClass =
                    txn.type === "topup"
                        ? "txn-topup"
                        : txn.type === "payment"
                            ? "txn-payment"
                            : `txn-${txn.type}`;

                const txnEl = createElement(
                    "div",
                    { class: `txn-item ${typeClass}` },
                    [
                        createElement(
                            "div",
                            { class: "txn-info" },
                            [
                                `${typeLabel} ${formatCurrency(txn.amount)} via ${txn.method}`
                            ]
                        )
                    ]
                );

                // Meta row
                const metaEl = createElement(
                    "div",
                    { class: "txn-meta" },
                    []
                );

                metaEl.appendChild(renderStatusBadge(txn.status));

                const dateEl = Datex(txn.created_at);

                if (dateEl instanceof Node) {
                    dateEl.classList.add("txn-date");
                    metaEl.appendChild(dateEl);
                } else {
                    metaEl.appendChild(
                        createElement(
                            "span",
                            { class: "txn-date" },
                            [String(dateEl)]
                        )
                    );
                }

                txnEl.appendChild(metaEl);

                // Sender/recipient info
                const accounts = [];

                if (txn.from_account) {
                    accounts.push(`From: ${txn.from_account}`);
                }

                if (txn.to_account) {
                    accounts.push(`To: ${txn.to_account}`);
                }

                if (accounts.length) {
                    txnEl.appendChild(
                        createElement(
                            "div",
                            { class: "txn-accounts" },
                            [accounts.join(" | ")]
                        )
                    );
                }

                // Additional metadata
                const extraInfo = [];

                if (txn.meta?.note) {
                    extraInfo.push(txn.meta.note);
                }

                const entityType =
                    txn.entity_type || txn.meta?.entity_type;

                const entityId =
                    txn.entity_id || txn.meta?.entity_id;

                if (entityType && entityId) {
                    extraInfo.push(`${entityType} (${entityId})`);
                }

                if (extraInfo.length) {
                    txnEl.appendChild(
                        createElement(
                            "div",
                            { class: "txn-extra" },
                            [extraInfo.join(" | ")]
                        )
                    );
                }

                // Refund button
                if (
                    txn.type === "payment" &&
                    txn.status === "success" &&
                    txn.from_account === txn.userid
                ) {
                    const refundBtn = Button(
                        "Refund",
                        "",
                        {
                            click: async () => {
                                if (!confirm("Refund this transaction?")) {
                                    return;
                                }

                                refundBtn.disabled = true;

                                try {
                                    const idempotencyKey = uuidv4();

                                    const refundRes = await apiFetch(
                                        "/wallet/refund",
                                        "POST",
                                        {
                                            transaction_id: txn.id
                                        },
                                        {
                                            headers: {
                                                "Idempotency-Key":
                                                    idempotencyKey
                                            }
                                        }
                                    );

                                    if (refundRes?.success) {
                                        Notify("Refund successful", {
                                            type: "success"
                                        });

                                        if (onBalanceChange) {
                                            onBalanceChange();
                                        }

                                        skip = 0;
                                        await loadTransactions();
                                    } else {
                                        Notify(
                                            refundRes?.message ||
                                            "Refund failed",
                                            { type: "error" }
                                        );
                                    }
                                } catch (err) {
                                    console.error(err);

                                    Notify(
                                        "Refund failed due to server error",
                                        { type: "error" }
                                    );
                                } finally {
                                    refundBtn.disabled = false;
                                }
                            }
                        }
                    );

                    metaEl.appendChild(refundBtn);
                }

                container.appendChild(txnEl);
            });

            if (transactions.length === limit) {
                const moreBtn = Button(
                    "Load More",
                    "load-more",
                    {
                        click: async () => {
                            moreBtn.disabled = true;

                            try {
                                skip += limit;
                                await loadTransactions();
                            } finally {
                                moreBtn.disabled = false;
                            }
                        }
                    }
                );

                container.appendChild(moreBtn);
            }
        } catch (err) {
            console.error(err);

            container.appendChild(
                createElement(
                    "div",
                    { class: "txn-error" },
                    ["Error loading transactions"]
                )
            );
        }
    }

    loadTransactions();

    return container;
}