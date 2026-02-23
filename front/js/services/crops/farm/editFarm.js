import { apiFetch } from "../../../api/api.js";
import { createFarmForm } from "./createOrEditFarm.js";
import { displayFarm } from "./farmDisplay.js";

export function editFarm(isLoggedIn, farm, container) {
    container.textContent = "";

    if (!isLoggedIn) {
        container.textContent = "Please log in to edit this farm.";
        return;
    }

    const form = createFarmForm({
        isEdit: true,
        farm,
        onSubmit: async (formData) => {
            const res = await apiFetch(`/farms/${farm.farmid}`, "PUT", formData, true);
            if (res.success) {
                displayFarm(isLoggedIn, farm.farmid, container);
            } else {
                container.textContent = "❌ Failed to update farm.";
            }
        }
    });

    container.appendChild(form);
}
