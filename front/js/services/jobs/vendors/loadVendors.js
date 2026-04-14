import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { hireVendor } from "./hireVendorAction.js";

/**
 * Load and display available vendors
 * Fetches vendors and displays them in a grid layout
 */
export async function loadVendors(eventId, isLoggedIn = true) {
    let vendors = [];
    let eventVendors = [];

    try {
        // Fetch all available vendors
        vendors = await apiFetch(`/vendors`, "GET");

        // Fetch vendors already hired for this event
        if (eventId) {
            try {
                eventVendors = await apiFetch(`/vendors/events/${eventId}`, "GET");
            } catch (error) {
                console.error("Failed to load event vendors:", error);
            }
        }
    } catch (error) {
        console.error("Failed to load vendors:", error);
        Notify("Failed to load vendors.", { type: "error" });
    }

    const container = createElement("div", { id: "vendors-list" }, [
        createElement("h4", {}, ["Available Vendors"])
    ]);

    if (!vendors || vendors.length === 0) {
        container.appendChild(
            createElement("div", { class: "no-vendors-message" }, [
                "No vendors available yet. Be the first to register! 🌟"
            ])
        );
        return container;
    }

    // Create vendor grid
    const vendorGrid = createElement("div", { class: "vendor-grid" });

    vendors.forEach((vendor) => {
        const isHired = eventVendors.some((ev) => ev.vendorid === vendor.vendorid);

        const vendorCard = createElement("div", { class: "vendor-card" }, [
            // Vendor name
            createElement("h5", {}, [vendor.name]),

            // Category badge
            createElement("span", { class: "vendor-category" }, [vendor.category]),

            // Vendor info
            createElement("div", { class: "vendor-info" }, [
                vendor.location
                    ? createElement("div", {}, [
                        createElement("strong", {}, ["Location: "]),
                        vendor.location
                    ])
                    : null,
                vendor.description
                    ? createElement("div", {}, [vendor.description])
                    : null
            ].filter(Boolean)),

            // Rating (if available)
            vendor.rating > 0 || vendor.rating_count > 0
                ? createElement("div", { class: "vendor-rating" }, [
                    `⭐ ${(vendor.rating || 0).toFixed(1)} (${vendor.rating_count || 0} reviews)`
                ])
                : null,

            // Contact info
            vendor.phone || vendor.email
                ? createElement("div", { class: "vendor-contact" }, [
                    vendor.phone ? `📞 ${vendor.phone}` : null,
                    vendor.phone && vendor.email ? " | " : null,
                    vendor.email ? `📧 ${vendor.email}` : null
                ].filter(Boolean).join(""))
                : null,

            // Action buttons
            createElement("div", { class: "vendor-actions" }, [
                Button(
                    isHired ? "Already Hired ✓" : "Hire Vendor",
                    `hire-${vendor.vendorid}`,
                    {
                        class: `hire-btn ${isHired ? "hired" : ""}`,
                        disabled: isHired,
                        click: async () => {
                            if (!isLoggedIn) {
                                Notify("Please log in to hire vendors.", {
                                    type: "warning",
                                    duration: 3000
                                });
                                return;
                            }
                            await hireVendor(eventId, vendor.vendorid, vendor.name);
                            // Reload after hiring
                            setTimeout(() => {
                                location.reload();
                            }, 1500);
                        }
                    }
                )
            ])
        ].filter(Boolean));

        vendorGrid.appendChild(vendorCard);
    });

    container.appendChild(vendorGrid);
    return container;
}

