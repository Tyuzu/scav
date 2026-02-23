import { setState, getState } from '../../state/state.js';
import { apiFetch } from "../../api/api.js";
import { fetchProfile } from './fetchProfile.js';
import Notify from "../../components/ui/Notify.mjs";

async function toggleAction({ entityId, entityType, button, apiPath, property, labels, actionName }) {
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
    const wasActive = isActive;

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

        // For user entity, refresh profile state
        if (entityType === "user") {
            const updatedProfile = await fetchProfile();
            setState({ userProfile: updatedProfile }, true);
        }

        Notify(
            `You have ${!wasActive ? actionName : `un${actionName}`} this ${entityType}.`,
            { type: "success", duration: 3000, dismissible: true }
        );
    } catch (error) {
        // Rollback on failure
        button.textContent = originalText;
        button.dataset.active = String(wasActive);
        button.disabled = false;

        console.error(`Error toggling ${actionName}:`, error);
        Notify(`Failed to update ${actionName}: ${error.message}`, { type: "error", duration: 3000, dismissible: true });
    }
}

// Legacy wrapper for compatibility
function toggleFollow(userId, followButton) {
    toggleAction({
        entityId: userId,
        entityType: "user",
        button: followButton,
        apiPath: "/follow/",
        property: "isFollowing",
        labels: { on: "Unfollow", off: "Follow" },
        actionName: "followed"
    });
}

export { toggleFollow, toggleAction };
