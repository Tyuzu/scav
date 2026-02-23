import { getState, setState } from '../../state/state.js';
import { apiFetch } from "../../api/api.js";
import { handleError } from "../../utils/utils.js";
import { renderPage, navigate } from "../../routes/index.js";
import { showLoadingMessage, removeLoadingMessage } from "./profileHelpers.js";
import { generateFormField } from "./generators.js";
import { deleteProfile } from "./userProfileService.js";
import { createElement } from "../../components/createElement.js";
import Button from '../../components/base/Button.js';
import Notify from "../../components/ui/Notify.mjs";

async function editProfile(content) {
    content.replaceChildren(); // Clear content

    const profile = getState("userProfile");
    if (!profile) {
        Notify("Please log in to edit your profile.", {type:"warning",duration:3000, dismissible:true});
        return;
    }

    const { username, name, email, bio, phone_number } = profile;

    const title = createElement("h2", {}, ["Edit Profile"]);

    const form = createElement("form", {
        id: "edit-profile-form",
        class: "create-section"
    });

    const fields = [
        generateFormField("Username", "edit-username", "text", username),
        generateFormField("Name", "edit-name", "text", name),
        generateFormField("Email", "edit-email", "email", email),
        generateFormField("Bio", "edit-bio", "textarea", bio || ""),
        generateFormField("Phone Number", "edit-phone", "text", phone_number || "")
    ];

    fields.forEach(field => {
        if (field) form.appendChild(field);
    });

    const updateBtn = Button("Update Profile", "update-profile-btn", {
        click: () => {
            updateProfile(new FormData(form));
        }
    }, "buttonx primary");

    const cancelBtn = Button("Cancel", "cancel-profile-btn", {
        click: () => {
            Notify("Profile editing canceled.", {type:"info",duration:3000, dismissible:true});
            navigate("/profile");
            window.location.pathname = window.location.pathname;
        }
    }, "buttonx secondary");

    form.appendChild(updateBtn);
    form.appendChild(cancelBtn);

    const deleteBtn = Button("Delete Profile", "btndelprof", {
        "click": () => {
            deleteProfile();
        }
    }, "btn delete-btn");
    deleteBtn.setAttribute("data-action", "delete-profile");

    content.append(title, form, deleteBtn);
}


async function updateProfile(formData) {
    if (!getState("token")) {
        Notify("Please log in to update your profile.", {type:"warning",duration:3000, dismissible:true});
        return;
    }

    const currentProfile = getState("userProfile") || {};
    const updatedFields = {};

    for (const [key, value] of formData.entries()) {
        const fieldName = key.replace("edit-", "");
        const trimmedValue = value.trim();

        if (trimmedValue !== (currentProfile[fieldName] || "").trim()) {
            updatedFields[fieldName] = trimmedValue;
        }
    }

    if (Object.keys(updatedFields).length === 0) {
        Notify("No changes were made to the profile.", {type:"info",duration:3000, dismissible:true});
        return;
    }

    showLoadingMessage("Updating...");

    try {
        const updateFormData = new FormData();
        Object.entries(updatedFields).forEach(([key, value]) => updateFormData.append(key, value));

        const updatedProfile = await apiFetch("/profile/edit", "PUT", updateFormData);
        if (!updatedProfile) throw new Error("No response received for the profile update.");

        const mergedProfile = { ...currentProfile, ...updatedProfile };
        setState({ userProfile: mergedProfile }, true);

        Notify("Profile updated successfully.", {type:"success",duration:3000, dismissible:true});
        // renderPage();
    } catch (error) {
        console.error("Error updating profile:", error);
        handleError("Error updating profile. Please try again.");
    } finally {
        removeLoadingMessage();
    }
}

export { editProfile };
