import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";

/**
 * Handle vendor hiring action
 * Sends a POST request to hire a vendor for an event
 */
export async function hireVendor(eventId, vendorId, vendorName) {
    if (!eventId) {
        Notify("Event ID is required to hire vendors.", {
            type: "error",
            duration: 3000
        });
        return;
    }

    try {
        const result = await apiFetch(
            `/vendors/events/${eventId}/hire`,
            "POST",
            { vendorid: vendorId }
        );

        // Check for specific error conditions
        if (result.error === "ALREADY_HIRED") {
            Notify(`${vendorName} is already hired for this event.`, {
                type: "info",
                duration: 3000
            });
            return;
        }

        // Success
        Notify(`✓ Successfully hired ${vendorName} for your event!`, {
            type: "success",
            duration: 3000
        });

        // Optional: Trigger a callback or refresh
        if (typeof window.onVendorHired === "function") {
            window.onVendorHired(result);
        }
    } catch (error) {
        console.error("Error hiring vendor:", error);

        // Handle specific error messages
        if (error.message && error.message.includes("already hired")) {
            Notify(`${vendorName} is already hired for this event.`, {
                type: "info",
                duration: 3000
            });
        } else if (error.message && error.message.includes("not found")) {
            Notify("Vendor not found. Please refresh and try again.", {
                type: "error",
                duration: 3000
            });
        } else {
            Notify("Failed to hire vendor. Please try again.", {
                type: "error",
                duration: 3000
            });
        }
    }
}

/**
 * Remove a vendor from an event
 */
export async function removeVendor(eventId, vendorId, vendorName) {
    if (!eventId || !vendorId) {
        Notify("Invalid event or vendor ID.", {
            type: "error"
        });
        return;
    }

    try {
        await apiFetch(
            `/vendors/events/${eventId}/vendor/${vendorId}`,
            "DELETE"
        );

        Notify(`${vendorName} has been removed from your event.`, {
            type: "success",
            duration: 3000
        });

        // Trigger refresh
        if (typeof window.onVendorRemoved === "function") {
            window.onVendorRemoved(vendorId);
        }
    } catch (error) {
        console.error("Error removing vendor:", error);
        Notify("Failed to remove vendor. Please try again.", {
            type: "error",
            duration: 3000
        });
    }
}

