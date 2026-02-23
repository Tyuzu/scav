import { getState } from '../../state/state.js';
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import { logout } from "../../services/auth/authService.js";
import { fetchProfile } from "./fetchProfile.js";
import profilGen from "./renderUserProfile.js";
import { editProfile } from "./editProfile.js";
import Notify from "../../components/ui/Notify.mjs";

// Display the profile content in the profile section
async function displayProfile(isLoggedIn, content) {
    content.textContent = ""; // Clear existing content
    if (isLoggedIn) {
        try {
            const profile = await fetchProfile(isLoggedIn);
            if (profile) {
                const profileElement = profilGen(profile, isLoggedIn);
                content.appendChild(profileElement);
                attachProfileEventListeners(content); // Attach event listeners for buttons
            } else {
                const loginMessage = document.createElement("p");
                loginMessage.textContent = "Please log in to see your profile.";
                profileSection.appendChild(loginMessage);
            }
        } catch (error) {
            const errorMessage = document.createElement("p");
            errorMessage.textContent = "Failed to load profile. Please try again later.";
            content.appendChild(errorMessage);
        }
    } else {
        navigate("/login");
    }
}

// Attach event listeners for the profile page
function attachProfileEventListeners(content) {
    const editButton = document.querySelector('[data-action="edit-profile"]');
    const deleteButton = document.querySelector('[data-action="delete-profile"]');

    if (editButton) {
        editButton.addEventListener("click", () => {
            editProfile(content);
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener("click", () => {
            deleteProfile();
        });
    }
}

async function deleteProfile() {
    if (!getState("token")) {

        Notify("Please log in to delete your profile.", {type:"warning",duration:3000, dismissible:true});
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete your profile? This action cannot be undone.");
    if (!confirmDelete) {
        return;
    }

    try {
        await apiFetch('/profile/delete', 'DELETE');

        Notify("Profile deleted successfully.", {type:"success",duration:3000, dismissible:true});
        logout(true);
    } catch (error) {

        Notify(`Failed to delete profile: ${error.message}`, {type:"error",duration:3000, dismissible:true});
    }
};

export { displayProfile, deleteProfile, attachProfileEventListeners };