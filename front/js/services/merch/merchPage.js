// merchPage.js

import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { addToCart } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import Datex from "../../components/base/Datex.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";
import { showPaymentModal } from "../pay/pay.js";

export async function displayMerch(contentContainer, merchID, isLoggedIn, entityType, entityId) {
    contentContainer.replaceChildren();

    if (!isLoggedIn) {
        contentContainer.textContent = "Please log in to view merch details.";
        return;
    }

    const merchContainer = createElement(
        "div",
        { class: "merch-details-container product-page", style: "max-width:800px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:16px;" },
        []
    );

    merchContainer.appendChild(createElement("p", {}, ["Loading merch details..."]));
    contentContainer.appendChild(merchContainer);

    try {
        const resp = await apiFetch(`/merch/${encodeURIComponent(merchID)}`, "GET");
        const data = resp?.data;

        if (!data?.merchid) {
            merchContainer.replaceChildren(createElement("p", { style: "color:red;" }, ["Failed to fetch merch details."]));
            return;
        }

        merchContainer.replaceChildren();

        const topSection = createElement("div", { class: "product-top-section", style: "display:flex;flex-wrap:wrap;gap:24px;" }, []);

        const imgContainer = createElement("div", { class: "product-image-container", style: "flex:1 1 300px;text-align:center;" }, []);
        if (data.merch_pic) {
            const img = Imagex({ src: resolveImagePath(EntityType.MERCH, PictureType.THUMB, data.merch_pic), alt: data.name || "Merch Image", style: "max-width:100%;border-radius:4px;" });
            imgContainer.appendChild(img);
        } else {
            imgContainer.appendChild(createElement("div", { style: "width:100%;padding-top:75%;background-color:#f0f0f0;border-radius:4px;" }, []));
        }

        const detailsContainer = createElement("div", { class: "product-details-container", style: "flex:1 1 300px;display:flex;flex-direction:column;gap:8px;" }, []);
        detailsContainer.appendChild(createElement("h1", { style: "margin:0;font-size:1.75em;line-height:1.2;" }, [data.name]));
        const priceText = Number(data.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        detailsContainer.appendChild(createElement("p", { style: "font-size:1.5em;font-weight:bold;margin:0;color:#E53935;" }, [`₹${priceText}`]));

        const inStock = data.stock > 0;
        detailsContainer.appendChild(createElement("p", { style: `margin:0;font-size:0.95em;color:${inStock?"#388E3C":"#D32F2F"};` }, [inStock ? `In Stock (${data.stock} available)` : "Out of Stock"]));

        const actionRow = createElement("div", { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;" }, []);
        const qtyInput = createElement("input", { type:"number", value:"1", min:"1", max:data.stock || "999", style:"width:60px;padding:4px;font-size:1em;border:1px solid #ccc;border-radius:4px;" });
        
        const addToCartBtn = Button("Add to Cart", "add-to-cart", {}, "action-btn", { color:"white", background:"#1976D2", opacity:`${inStock?"1":"0.6"}` });
        addToCartBtn.disabled = !inStock;

        addToCartBtn.addEventListener("click", async () => {
            const qty = parseInt(qtyInput.value, 10);
            if (isNaN(qty) || qty < 1 || qty > data.stock) {
                Notify(`Invalid quantity. Please enter 1-${data.stock}`, { type: "warning" });
                return;
            }
            
            await addToCart({
                itemId: data.merchid,
                quantity: qty,
                isLoggedIn: Boolean(getState("token")),
                itemType: "merch",
                itemName: data.name,
                entityType: entityType || data.entity_type,
                entityId: entityId || data.entity_id,
                entityName: data.name
            });
        });

        const buyNowBtn = Button("Buy Now", "buy-now", {}, "action-btn", { color:"white", background:"#388E3C", opacity:`${inStock?"1":"0.6"}` });
        buyNowBtn.disabled = !inStock;

        buyNowBtn.addEventListener("click", async () => {
            const qty = parseInt(qtyInput.value, 10);
            if (isNaN(qty) || qty < 1 || qty > data.stock) {
                Notify(`Invalid quantity. Please enter 1-${data.stock}`, { type: "warning" });
                return;
            }

            const noteInput = createElement("textarea", {
                placeholder: "Special request (optional)",
                rows: 3
            });

            const modal = Modal({
                title: `Purchase ${data.name}`,
                content: createElement("div", { class: "modal-form-group" }, [
                    createElement("p", {}, [`Quantity: ${qty}`]),
                    createElement("label", {}, ["Note: ", noteInput])
                ]),
                actions: () =>
                    createElement("div", { class: "modal-actions" }, [
                        Button(
                            "Proceed to Payment",
                            "",
                            {
                                click: async () => {
                                    const note = noteInput.value.trim();
                                    modal.close();

                                    try {
                                        const paymentResult = await showPaymentModal({
                                            paymentType: "purchase",
                                            entityType: "merch",
                                            entityId: data.merchid,
                                            entityName: data.name
                                        });

                                        if (!paymentResult || paymentResult.success !== true) {
                                            return Notify("Payment cancelled or failed.", {
                                                type: "warning"
                                            });
                                        }

                                        const confirmResp = await apiFetch(
                                            `/merch/${entityType || data.entity_type}/${entityId || data.entity_id}/${data.merchid}/confirm-purchase`,
                                            "POST",
                                            {
                                                quantity: qty,
                                                note
                                            }
                                        );

                                        if (confirmResp.success) {
                                            Notify("Merchandise purchased successfully!", {
                                                type: "success"
                                            });
                                        } else {
                                            Notify(confirmResp.message || "Purchase failed.", {
                                                type: "error"
                                            });
                                        }
                                    } catch (err) {
                                        console.error("Purchase error:", err);
                                        Notify(`Purchase failed: ${err.message}`, {
                                            type: "error"
                                        });
                                    }
                                }
                            },
                            "buttonx primary"
                        ),
                        Button(
                            "Cancel",
                            "",
                            { click: () => modal.close() },
                            "buttonx"
                        )
                    ])
            });
        });

        actionRow.append(createElement("label", {}, ["Qty:"]), qtyInput, addToCartBtn, buyNowBtn);
        detailsContainer.appendChild(actionRow);

        if (data.description) {
detailsContainer.appendChild(createElement("p", { style:"margin-top:12px;font-size:1em;line-height:1.4;" }, [data.description]));
}

        topSection.append(imgContainer, detailsContainer);
        merchContainer.appendChild(topSection);

        const metaInfo = createElement("div", { style:"font-size:0.85em;color:#555;margin-top:24px;display:flex;flex-direction:column;gap:4px;" }, []);
        if (data.entity_type && data.entity_id) {
metaInfo.appendChild(createElement("a", { href:`/${data.entity_type}/${data.entity_id}`, style:"color:#1976D2;text-decoration:none;" }, [`View related ${data.entity_type}`]));
}
        if (data.created_at) {
metaInfo.appendChild(createElement("p", {}, [`Created At: ${new Date(data.created_at).toLocaleString()}`]));
}
        if (data.updatedAt) {
metaInfo.appendChild(createElement("p", {}, [`Last Updated: ${Datex(data.updatedAt)}`]));
}
        if (data.merchid) {
metaInfo.appendChild(createElement("p", {}, [`Merch ID: ${data.merchid}`]));
}
        merchContainer.appendChild(metaInfo);

    } catch (err) {
        merchContainer.replaceChildren(createElement("p", { style:"color:red;" }, ["An error occurred while fetching merch details."]));
        console.error("Error fetching merch details:", err);
    }
}
