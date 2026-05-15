import { apiFetch } from "../../api/api.js";
import MerchCard from '../../components/ui/MerchCard.mjs';
import { Button } from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";

import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import { reportPost } from "../reporting/reporting.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import Imagex from "../../components/base/Imagex.js";
import { addToCart } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { showPaymentModal } from "../pay/pay.js";

import { addMerchandise, displayNewMerchandise, clearMerchForm, deleteMerch, editMerchForm } from "./merchAPI.js";

// --- Add Merchandise Form ---
function addMerchForm(entityType, eventId, merchList) {
    const form = createElement("form", { id: "add-merch-form", class: "create-section" });
    const fields = [
        { label: "Merchandise Name", type: "text", id: "merch-name", placeholder: "Merchandise Name", required: true },
        { label: "Price", type: "number", id: "merch-price", placeholder: "Price", required: true },
        { label: "Stock Available", type: "number", id: "merch-stock", placeholder: "Stock Available", required: true },
        { label: "Merch Image", type: "file", id: "merch-image", additionalProps: { accept: "image/*" } }
    ];
    fields.forEach(f => form.appendChild(createFormGroup(f)));

    const addBtn = createElement("button", { type: "submit", class: "buttonx" }, ["Add Merchandise"]);
    form.appendChild(addBtn);

    const { close: closeModal } = Modal({ title: "Add Merchandise", content: form });

    form.addEventListener("submit", async e => {
        e.preventDefault();
        await addMerchandise(entityType, eventId, merchList);
        closeModal();
    });
}

// --- Display Merchandise List ---
async function displayMerchandise(container, merchData, entityType, eventId, isCreator, isLoggedIn) {
    container.replaceChildren();
    container.appendChild(createElement("h2", {}, ["Merchandise"]));
  
    const merchList = createElement("div", { class: "merchcon hvflex" });
    container.appendChild(merchList);
  
    if (isCreator) {
      container.appendChild(
        Button(
          "Add Merchandise",
          "add-merch-btn",
          { click: () => addMerchForm(entityType, eventId, merchList) },
          "buttonx"
        )
      );
    }
  
    if (!Array.isArray(merchData) || merchData.length === 0) {
      merchList.appendChild(createElement("p", {}, ["No merchandise available."]));
      return;
    }
  
    merchData.forEach(merch => {
      const card = MerchCard({
        name: merch.name,
        price: merch.price,
        image: resolveImagePath(
          EntityType.MERCH,
          PictureType.THUMB,
          merch.merch_pic
        ),
        stock: merch.stock,
        isCreator,
        isLoggedIn,
        
        onAddToCart: async () => {
          if (!isLoggedIn) {
            Notify("Please log in to add items to cart", { type: "warning" });
            return;
          }

          const quantityInput = createElement("input", {
            type: "number",
            min: 1,
            max: merch.stock,
            value: 1
          });

          const wrapper = createElement("div", { class: "modal-form-group" }, [
            createElement("label", {}, ["Quantity: ", quantityInput])
          ]);

          const modal = Modal({
            title: `Add ${merch.name} to Cart`,
            content: wrapper,
            actions: () =>
              createElement("div", { class: "modal-actions" }, [
                Button(
                  "Add to Cart",
                  "",
                  {
                    click: async () => {
                      const quantity = parseInt(quantityInput.value, 10);

                      if (
                        !Number.isInteger(quantity) ||
                        quantity < 1 ||
                        quantity > merch.stock
                      ) {
                        return Notify(
                          `⚠️ Enter a valid quantity (1-${merch.stock}).`,
                          { type: "warning" }
                        );
                      }

                      const success = await addToCart({
                        itemId: merch.merchid,
                        quantity,
                        isLoggedIn: Boolean(getState("token")),
                        itemType: "merch",
                        itemName: merch.name,
                        entityType: entityType,
                        entityId: eventId,
                        entityName: merch.name
                      });

                      if (success) {
                        modal.close();
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
        },

        onBuy: async () => {
          const quantityInput = createElement("input", {
            type: "number",
            min: 1,
            value: 1,
            max: merch.stock
          });

          const noteInput = createElement("textarea", {
            placeholder: "Special request (optional)",
            rows: 3
          });

          const wrapper = createElement("div", { class: "modal-form-group" }, [
            createElement("label", {}, ["Quantity: ", quantityInput]),
            createElement("label", {}, ["Note: ", noteInput])
          ]);

          const modal = Modal({
            title: `Purchase ${merch.name}`,
            content: wrapper,
            actions: () =>
              createElement("div", { class: "modal-actions" }, [
                Button(
                  "Proceed to Payment",
                  "",
                  {
                    click: async () => {
                      const quantity = parseInt(quantityInput.value, 10);
                      const note = noteInput.value.trim();

                      if (
                        !Number.isInteger(quantity) ||
                        quantity < 1 ||
                        quantity > merch.stock
                      ) {
                        return Notify(
                          `⚠️ Enter a valid quantity (1-${merch.stock}).`,
                          { type: "warning" }
                        );
                      }

                      modal.close();

                      try {
                        const paymentResult = await showPaymentModal({
                          paymentType: "purchase",
                          entityType: "merch",
                          entityId: merch.merchid,
                          entityName: merch.name
                        });

                        if (!paymentResult || paymentResult.success !== true) {
                          return Notify("Payment cancelled or failed.", {
                            type: "warning"
                          });
                        }

                        const resp = await apiFetch(
                          `/merch/${entityType}/${eventId}/${merch.merchid}/confirm-purchase`,
                          "POST",
                          {
                            quantity,
                            note
                          }
                        );

                        if (resp.success) {
                          Notify("Merchandise purchased successfully!", {
                            type: "success"
                          });
                        } else {
                          Notify(resp.message || "Purchase failed.", {
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
        },

        onEdit: () => editMerchForm(entityType, merch.merchid, eventId),
        onDelete: () => deleteMerch(entityType, merch.merchid, eventId),
        onReport: () => reportPost(merch.merchid, "merch", entityType, eventId)
      });

      merchList.appendChild(card);
    });
  }
  
export {
    addMerchForm,
    displayMerchandise
};
