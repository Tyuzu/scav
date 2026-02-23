import { createElement } from "../../../components/createElement.js";
import Notify from "../../../components/ui/Notify.mjs";
import { loadVendors } from "./loadVendors.js";
import { vendorForm } from "./vendorForm.js";

export async function hireVendors(anacon, isLoggedIn, eventId) {
    if (!isLoggedIn) {
        Notify("Please log in first.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    // Clear old content
    anacon.innerHTML = "";

    // Wrapper
    const container = createElement("div", { id: "vendors-wrapper" }, [
        createElement("h3", {}, ["Vendors Marketplace"])
    ]);

    // Load vendors
    const vendorListEl = await loadVendors(eventId);
    container.appendChild(vendorListEl);

    // Add vendor registration form
    container.appendChild(vendorForm(anacon, isLoggedIn, eventId));

    anacon.appendChild(container);
}

