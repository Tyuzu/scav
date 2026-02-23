import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { hireVendor } from "./hireVendorAction.js";

export async function loadVendors(eventId) {
    let vendors = [];
    try {
        vendors = await apiFetch(`/vendors`, "GET");
    } catch {
        Notify("Failed to load vendors.", { type: "error" });
    }

    const container = createElement("div", { id: "vendors-list" }, [
        createElement("h4", {}, ["Available Vendors"])
    ]);

    if (vendors.length === 0) {
        container.appendChild(createElement("p", {}, ["No vendors available yet."]));
        return container;
    }

    vendors.forEach(vendor => {
        const vendorBox = createElement("div", { class: "vendor-box" }, [
            createElement("span", {}, [`${vendor.name} (${vendor.category})`]),
            Button("Hire", `hire-${vendor.vendorid}`, {
                click: async () => hireVendor(eventId, vendor.vendorid, vendor.name)
            })
        ]);
        container.appendChild(vendorBox);
    });

    return container;
}
