import { createCommonCropForm } from "./createOrEditCrop.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { navigate } from "../../../routes/index.js";

// export default function createCropPage({ farmName }) {
export async function createCrop(farmName, container) {
    // const container = document.createElement("div");

    const form = createCommonCropForm({
        currentFarmName: farmName,
        isEdit: false,
        onSubmit: async (formData, submitBtn) => {
            submitBtn.disabled = true;
            try {
                const res = await apiFetch(`/farms/${farmName}/crops`, "POST", formData);
                // container.textContent = "✅ Crop created successfully.";
                Notify("✅ Crop created successfully.", {type:"success", duration: 3000});
                navigate(window.location.pathname);
            } catch (err) {
                container.textContent = `❌ ${err.message}`;
            } finally {
                submitBtn.disabled = false;
            }
        }
    });

    container.appendChild(form);
    return container;
}
