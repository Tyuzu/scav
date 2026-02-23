import { fetchUserProfileData } from "../profile/fetchProfile.js";
import { renderEntityData } from "./entityRenderer.js";
import Notify from "../../components/ui/Notify.mjs";

/** Fetch and render data only when the tab is first opened. */
async function renderTabContent(container, username, entityType) {
    try {
        container.textContent = "Loading...";
        const data = await fetchUserProfileData(username, entityType);
        renderEntityData(container, data, entityType);
    } catch (error) {
        console.error(`Error fetching data for ${entityType}:`, error);
        Notify(`Failed to load ${entityType} data. Please try again.`, {type:"error",duration:3000, dismissible:true});
        container.textContent = "Error loading data.";
    }
}

export { renderTabContent };
