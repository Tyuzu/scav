import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";

export async function hireVendor(eventId, vendorId, vendorName) {
    try {
        const result = await apiFetch(`/events/${eventId}/hire`, "POST", { vendorId });

        if (result.error === "ALREADY_HIRED") {
            Notify(`${vendorName} is already hired for this event.`, { type: "warning" });
            return;
        }

        Notify(`You hired ${vendorName}.`, { type: "success" });
    } catch {
        Notify("Failed to hire vendor.", { type: "error" });
    }
}
