import { getState } from '../../state/state.js';
import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";

/**
 * Generic toggle action for follow/subscribe actions
 */
async function toggleAction({ entityId, entityType, button, apiPath, labels, actionName }) {
    if (!getState("token")) {
        Notify("Please log in first.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    if (!button) {
        Notify("Action button not found.", { type: "info", duration: 3000, dismissible: true });
        return;
    }

    const isActive = button.dataset.active === "true";
    const action = isActive ? "DELETE" : "PUT";
    const apiEndpoint = `${apiPath}${entityId}`;

    const originalText = button.textContent;

    // Optimistically update UI
    button.disabled = true;
    button.textContent = isActive ? labels.off : labels.on;
    button.dataset.active = String(!isActive);

    try {
        const response = await apiFetch(apiEndpoint, action);
        button.disabled = false;

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        Notify(
            `You have ${!isActive ? actionName : `un${actionName}`} this ${entityType}.`,
            { type: "success", duration: 3000, dismissible: true }
        );
    } catch (error) {
        // Rollback on failure
        button.textContent = originalText;
        button.dataset.active = String(isActive);
        button.disabled = false;

        console.error(`Error toggling ${actionName}:`, error);
        Notify(`Failed to update ${actionName}: ${error.message}`, { type: "error", duration: 3000, dismissible: true });
    }
}

/**
 * Legacy wrapper for user follow button
 */
function toggleFollow(userId, followButton) {
    FollowUser(followButton, userId);
}

export { toggleFollow, toggleAction };
