import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { hireVendors } from "./hireVendors.js";

export function vendorForm(anacon, isLoggedIn, eventId) {
    return createElement("form", { id: "vendor-form" }, [
        createElement("h4", {}, ["List Yourself as a Vendor"]),
        createElement("input", { type: "text", placeholder: "Your Name", name: "name", required: true }),
        createElement("input", { type: "text", placeholder: "Category (e.g., Ice Cream, Juice)", name: "category", required: true }),
        Button("Register as Vendor", "vendor-submit", {
            click: async (e) => {
                e.preventDefault();
                const formEl = document.getElementById("vendor-form");
                const name = formEl.querySelector("input[name='name']").value.trim();
                const category = formEl.querySelector("input[name='category']").value.trim();

                if (!name || !category) {
                    Notify("Please fill all fields.", { type: "warning" });
                    return;
                }

                try {
                    await apiFetch(`/vendors`, "POST", { name, category });
                    Notify("Vendor registered successfully.", { type: "success" });
                    hireVendors(anacon, isLoggedIn, eventId); // reload list
                } catch {
                    Notify("Failed to register vendor.", { type: "error" });
                }
            }
        })
    ]);
}
