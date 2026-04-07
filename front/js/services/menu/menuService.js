import { apiFetch } from "../../api/api.js";
import MenuCard from '../../components/ui/MenuCard.mjs';
import { Button } from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import Notify from "../../components/ui/Notify.mjs";
import { createFormGroup } from "../../components/createFormGroup.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import { showPaymentModal } from "../pay/pay.js";

/** Add a menu item */
async function addMenu(form, placeId, menuList) {
    const name = form.querySelector("#menu-name").value.trim();
    const price = parseFloat(form.querySelector("#menu-price").value);
    const stock = parseInt(form.querySelector("#menu-stock").value, 10);
    const imageFile = form.querySelector("#menu-image").files[0];

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
            const uploadObj = { id: uid(), file: imageFile, previewURL: URL.createObjectURL(imageFile), progress: 0, uploading: true, mediaEntity: "menu" };
            Notify("Uploading image...", { type: "info", duration: 2000 });
            uploadedImage = await uploadFile(uploadObj);
            if (!uploadedImage?.filename && !uploadedImage?.file) {
throw new Error("Image upload failed.");
}
        }

        const payload = { name, price, stock, menu_pic: uploadedImage?.filename || uploadedImage?.file || "" };
        const response = await apiFetch(`/places/menu/${placeId}`, "POST", payload);

        if (response?.data?.menuid) {
            Notify("Menu added successfully!", { type: "success", duration: 3000, dismissible: true });
            menuList.prepend(createMenuCard(response.data, true, true, placeId));
            form.reset();
        } else {
throw new Error(response?.message || "Unknown server error");
}
    } catch (error) {
        console.error("Error adding Menu:", error);
        Notify(`Error adding Menu: ${error.message}`, { type: "error" });
    }
}

/** Add Menu Form modal */
function addMenuForm(placeId, menuList) {
    const form = createElement("form", { id: "add-menu-form", class: "create-section" });

    const fields = [
        { label: "Menu Name", type: "text", id: "menu-name", name: "name", placeholder: "Menu Name", required: true },
        { label: "Price", type: "number", id: "menu-price", name: "price", placeholder: "Price", required: true, additionalProps: { min: 0, step: "0.01" } },
        { label: "Stock Available", type: "number", id: "menu-stock", name: "stock", placeholder: "Stock Available", required: true, additionalProps: { min: 0 } },
        { label: "Menu Image", type: "file", id: "menu-image", name: "image", additionalProps: { accept: "image/*" } }
    ];

    fields.forEach(f => form.appendChild(createFormGroup(f)));

    const addButton = Button("Add Menu", "", {}, "buttonx"); addButton.type = "submit";
    const cancelButton = Button("Cancel", "", {}, "buttonx"); cancelButton.type = "button";
    form.append(addButton, cancelButton);

    const modal = Modal({ title: "Add Menu", content: form });
    cancelButton.addEventListener("click", () => modal.close());

    form.addEventListener("submit", async e => {
        e.preventDefault();
        await addMenu(form, placeId, menuList);
        modal.close();
    });
}

/** Delete a menu item */
async function deleteMenu(menuId, placeId) {
    if (!confirm('Are you sure you want to delete this Menu?')) {
return;
}
    try {
        const response = await apiFetch(`/places/menu/${placeId}/${menuId}`, 'DELETE');
        if (response.success) {
            Notify("Menu deleted successfully!", { type: "success", duration: 3000, dismissible: true });
            const menuItem = document.getElementById(`menu-${menuId}`);
            if (menuItem) {
menuItem.remove();
}
        } else {
Notify(`Failed to delete Menu: ${response?.message || 'Unknown error'}`, { type: "error" });
}
    } catch (error) {
        console.error(error);
        Notify(`Error deleting Menu: ${error.message}`, { type: "error" });
    }
}

/** Create a MenuCard element */
function createMenuCard(menu, isCreator, isLoggedIn, placeId) {
    return MenuCard({
        name: menu.name,
        price: menu.price,
        image: resolveImagePath(EntityType.MENU, PictureType.THUMB, menu.menu_pic),
        stock: menu.stock,
        isCreator,
        isLoggedIn,
        onBuy: () => promptMenuNote(menu, placeId),
        onEdit: () => editMenuForm(menu.menuid, placeId),
        onDelete: () => deleteMenu(menu.menuid, placeId)
    });
}

/** Edit Menu Form modal */
async function editMenuForm(menuId, placeId) {
    try {
        const menu = await apiFetch(`/places/menu/${placeId}/${menuId}`, 'GET');
        const form = createElement('form', { id: 'edit-menu-form' });
        const fields = [
            { label: "Menu Name", type: "text", id: "menu-name", name: "name", value: menu.name, required: true },
            { label: "Price", type: "number", id: "menu-price", name: "price", value: menu.price, required: true, additionalProps: { min: 0, step: "0.01" } },
            { label: "Stock Available", type: "number", id: "menu-stock", name: "stock", value: menu.stock, required: true, additionalProps: { min: 0 } }
        ];
        fields.forEach(f => form.appendChild(createFormGroup(f)));

        const submitButton = Button("Update Menu", "", {}, "buttonx"); submitButton.type = "submit";
        const cancelButton = Button("Cancel", "", {}, "buttonx"); cancelButton.type = "button";
        form.append(submitButton, cancelButton);

        const modal = Modal({ title: "Edit Menu", content: form });
        cancelButton.addEventListener("click", () => modal.close());

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const updatedMenu = {
                name: form.querySelector("#menu-name").value,
                price: parseFloat(form.querySelector("#menu-price").value),
                stock: parseInt(form.querySelector("#menu-stock").value, 10)
            };
            try {
                const res = await apiFetch(`/places/menu/${placeId}/${menuId}`, "PUT", JSON.stringify(updatedMenu), { "Content-Type": "application/json" });
                if (res.success) {
                    Notify("Menu updated successfully!", { type: "success", duration: 3000 });
                    modal.close();
                } else {
                    Notify(`Failed to update menu: ${res.message}`, { type: "error" });
                }
            } catch (err) {
                Notify(`Error updating menu: ${err.message}`, { type: "error" });
            }
        });
    } catch (err) {
        Notify(`Failed to fetch menu: ${err.message}`, { type: "error" });
    }
}

/** Display list of menu items */
export async function displayMenu(container, placeId, isCreator, isLoggedIn) {
    container.replaceChildren();
    const menuList = createElement('div', { class: "hvflex menulist" });
    container.appendChild(menuList);

    const menuData = await apiFetch(`/places/menu/${placeId}`);

    if (isCreator) {
container.prepend(Button("Add Menu", "add-menu-btn", { click: () => addMenuForm(placeId, menuList) }, "buttonx"));
}
    if (!Array.isArray(menuData) || menuData.length === 0) {
return menuList.appendChild(createElement("p", {}, ["No Menu available for this place."]));
}

    menuData.forEach(menu => menuList.appendChild(createMenuCard(menu, isCreator, isLoggedIn, placeId)));
}
/** Prompt quantity and optional note, then payment */
async function promptMenuNote(menu, placeId) {
    const quantityInput = createElement("input", { type: "number", min: 1, value: 1 });
    const noteInput = createElement("textarea", {
      rows: 3,
      placeholder: "Special request (optional)"
    });
  
    const wrapper = createElement("div", { class: "modal-form-group" }, [
      createElement("label", {}, ["Quantity: ", quantityInput]),
      createElement("label", {}, ["Note: ", noteInput])
    ]);
  
    const modal = Modal({
      title: `Purchase: ${menu.name}`,
      content: wrapper,
      actions: () =>
        Button(
          "Next",
          "",
          {
            click: async () => {
              const quantity = parseInt(quantityInput.value, 10);
              const note = noteInput.value.trim();
  
              if (!Number.isInteger(quantity) || quantity < 1) {
                return Notify("⚠️ Please enter a valid quantity.", { type: "warning" });
              }
  
              try {
                const { stock } = await apiFetch(
                  `/places/menu/${placeId}/${menu.menuid}/stock`
                );
  
                if (stock <= 0) {
                  return Notify("❌ Out of stock.", { type: "warning" });
                }
  
                if (quantity > stock) {
                  return Notify(`⚠️ Only ${stock} available.`, { type: "warning" });
                }
  
                modal.close();
  
                const paymentResult = await showPaymentModal({
                  paymentType: "purchase",
                  entityType: "menu",
                  entityId: menu.menuid,
                  entityName: menu.name
                });
  
                if (!paymentResult || paymentResult.success !== true) {
                  return Notify("Payment was cancelled or failed.", {
                    type: "warning"
                  });
                }
  
                const res = await apiFetch(
                  `/places/menu/${placeId}/${menu.menuid}/confirm-purchase`,
                  "POST",
                  {
                    quantity,
                    note
                  }
                );
  
                if (res.success) {
                  Notify("Menu purchased successfully!", { type: "success" });
                } else {
                  Notify(res.message || "Purchase failed.", { type: "error" });
                }
              } catch (err) {
                console.error(err);
                Notify(`Error: ${err.message}`, { type: "error" });
              }
            }
          },
          "buttonx"
        )
    });
    modal.open();
  }
  