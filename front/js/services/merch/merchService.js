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

import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import { showPaymentModal } from "../pay/pay.js";

// --- Add Merchandise ---
async function addMerchandise(entityType, eventId, merchList) {
    const name = document.getElementById("merch-name").value.trim();
    const price = parseFloat(document.getElementById("merch-price").value);
    const stock = parseInt(document.getElementById("merch-stock").value, 10);
    const imageFile = document.getElementById("merch-image").files[0];

    if (!name || isNaN(price) || isNaN(stock)) {
        Notify("Please fill in all fields correctly.", { type: "error" });
        return;
    }
    if (imageFile && !imageFile.type.startsWith("image/")) {
        Notify("Please upload a valid image file.", { type: "error" });
        return;
    }

    try {
        let uploadedImage = null;
        if (imageFile) {
            const uploadObj = {
                id: uid(),
                file: imageFile,
                previewURL: URL.createObjectURL(imageFile),
                progress: 0,
                uploading: true,
                mediaEntity: "merch",
            };
            Notify("Uploading image...", { type: "info", duration: 2000 });
            uploadedImage = await uploadFile(uploadObj);
            if (!uploadedImage?.filename && !uploadedImage?.file) throw new Error("Image upload failed.");
        }

        const payload = {
            name,
            price,
            stock,
            merch_pic: uploadedImage?.filename || uploadedImage?.file || "",
        };

        const resp = await apiFetch(`/merch/${entityType}/${eventId}`, "POST", payload);
        if (!resp?.data?.merchid) throw new Error(resp?.message || "Invalid server response.");

        Notify(resp.message || "Merchandise added successfully.", { type: "success", duration: 3000 });
        displayNewMerchandise(resp.data, merchList);
        clearMerchForm();
    } catch (err) {
        console.error("Error adding merchandise:", err);
        Notify(`Error adding merchandise: ${err.message}`, { type: "error" });
    }
}

// --- Clear Form ---
function clearMerchForm() {
    const formContainer = document.getElementById('edittabs');
    if (formContainer) formContainer.replaceChildren();
}

// --- Delete Merchandise ---
async function deleteMerch(entityType, merchId, eventId) {
    if (!confirm('Are you sure you want to delete this merchandise?')) return;
    try {
        const resp = await apiFetch(`/merch/${entityType}/${eventId}/${merchId}`, 'DELETE');
        if (resp.success) {
            Notify('Merchandise deleted successfully!', { type: "success" });
            const merchItem = document.getElementById(`merch-${merchId}`);
            if (merchItem) merchItem.remove();
        } else {
            Notify(`Failed to delete merchandise: ${resp.message}`, { type: "error" });
        }
    } catch (err) {
        console.error('Error deleting merchandise:', err);
        Notify('An error occurred while deleting the merchandise.', { type: "error" });
    }
}

// --- Edit Merchandise ---
async function editMerchForm(entityType, merchId, eventId) {
    try {
        const resp = await apiFetch(`/merch/${entityType}/${eventId}/${merchId}`, 'GET');
        const data = resp?.data;
        if (!data) throw new Error("Merchandise not found.");

        const form = createElement("form", { id: "edit-merch-form" });
        const fields = [
            { label: "Name:", type: "text", id: "merchName", value: data.name, required: true },
            { label: "Price:", type: "number", id: "merchPrice", value: data.price, required: true, step: "0.01" },
            { label: "Stock:", type: "number", id: "merchStock", value: data.stock, required: true }
        ];
        fields.forEach(f => form.appendChild(createFormGroup(f)));

        const submitBtn = Button("Update Merchandise", "", { type: "submit" }, "buttonx");
        form.appendChild(submitBtn);

        const { close: closeModal } = Modal({ title: "Edit Merchandise", content: form });

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const merchData = {
                name: form.querySelector("#merchName").value,
                price: parseFloat(form.querySelector("#merchPrice").value),
                stock: parseInt(form.querySelector("#merchStock").value, 10)
            };
            try {
                const updateResp = await apiFetch(
                    `/merch/${entityType}/${eventId}/${merchId}`,
                    'PUT',
                    merchData
                );
                if (updateResp.success) {
                    Notify('Merchandise updated successfully!', { type: "success" });
                    closeModal();
                } else Notify(`Failed to update merchandise: ${updateResp.message}`, { type: "error" });
            } catch (err) {
                console.error("Error updating merchandise:", err);
                Notify("An error occurred while updating the merchandise.", { type: "error" });
            }
        });
    } catch (err) {
        console.error("Error fetching merchandise details:", err);
        Notify('An error occurred while fetching the merchandise details.', { type: "error" });
    }
}

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

// --- Display New Merchandise Item ---
function displayNewMerchandise(merchData, merchList) {
    const item = createElement("div", { class: "merch-item", id: `merch-${merchData.merchid}` });
    item.append(
        createElement("h3", {}, [merchData.name]),
        createElement("p", {}, [`Price: $${merchData.price.toFixed(2)}`]),
        createElement("p", {}, [`Available: ${merchData.stock}`])
    );
    if (merchData.merch_pic) {
        const img = Imagex({
            src: resolveImagePath(EntityType.MERCH, PictureType.THUMB, merchData.merch_pic),
            alt: merchData.name,
            loading: "lazy",
            style: "max-width:160px"
        });
        item.appendChild(img);
    }
    merchList.prepend(item);
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
  
        onBuy: async () => {
          const quantityInput = createElement("input", {
            type: "number",
            min: 1,
            value: 1
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
                  "Next",
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
                  "buttonx"
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
    addMerchandise,
    displayNewMerchandise,
    clearMerchForm,
    displayMerchandise,
    deleteMerch,
    editMerchForm
};
