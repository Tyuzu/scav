import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

// ------------------- CREATE ARTIST EXPORT -------------------
export function createArtist(isLoggedIn, content) {
    createOrEditArtist({ isLoggedIn, content, mode: "create" });
}

// ------------------- EDIT ARTIST EXPORT -------------------
export async function editArtist(isLoggedIn, content, artistID, existingArtist, isCreator) {
    createOrEditArtist({ isLoggedIn, content, mode: "edit", artistID, existingArtist, isCreator });
}

// ------------------- CREATE -------------------
async function submitArtistForm(section) {
    const formData = collectFormData(section);
    try {
        const response = await apiFetch("/artists", "POST", formData);
        Notify("Artist created successfully!", { type: "success", duration: 3000 });
        navigate(`/artist/${response.artistid}`);
    } catch (err) {
        Notify(`Failed to create artist: ${err.message}`, { type: "error", duration: 3000 });
    }
}

// ------------------- UPDATE -------------------
async function updateArtistForm(artistID, section) {
    const formData = collectFormData(section);
    try {
        await apiFetch(`/artists/${artistID}`, "PUT", formData);
        Notify("Artist updated successfully", { type: "success", duration: 3000 });
        navigate(`/artist/${artistID}`);
    } catch (err) {
        Notify(`Failed to update artist: ${err.message}`, { type: "error", duration: 3000 });
    }
}

// ------------------- CREATE OR EDIT ARTIST -------------------
export async function createOrEditArtist({ isLoggedIn, content, mode = "create", artistID = null, existingArtist = null, isCreator = false }) {
    if (!isLoggedIn) {
        Notify("Please log in to continue.", { type: "warning", duration: 3000 });
        navigate("/login");
        return;
    }

    if (mode === "edit" && !isCreator) {
        Notify("You are not authorized to edit this artist.", { type: "error", duration: 3000 });
        return;
    }

    content.replaceChildren();

    const section = createElement("div", { class: "create-section" });
    const heading = createElement("h2", {}, [mode === "create" ? "Create Artist" : "Edit Artist"]);
    section.appendChild(heading);

    const formFields = [
        { type: "select", id: "artist-category", label: "Artist Type", required: true,
          options: [
              { value: "", label: "Select a Type" },
              { value: "singer", label: "Singer" },
              { value: "band", label: "Band" },
              { value: "comedian", label: "Comedian" },
              { value: "actor", label: "Actor" },
              { value: "poet", label: "Poet" },
              { value: "musician", label: "Musician" },
              { value: "dancer", label: "Dancer" },
              { value: "magician", label: "Magician" },
              { value: "painter", label: "Painter" },
              { value: "photographer", label: "Photographer" },
              { value: "sculptor", label: "Sculptor" },
              { value: "other", label: "Other" }
          ]
        },
        { type: "text", id: "artist-name", label: "Artist Name", required: true, placeholder: "Enter artist name" },
        { type: "textarea", id: "artist-bio", label: "Artist's Biography", required: true, placeholder: "Write a short bio" },
        { type: "date", id: "artist-dob", label: "Date of Birth" },
        { type: "text", id: "artist-place", label: "Artist Place", required: true, placeholder: "City or place" },
        { type: "text", id: "artist-country", label: "Country", required: true, placeholder: "Country" },
        { type: "text", id: "artist-genres", label: "Genres (comma separated)", placeholder: "e.g., Jazz, Rock" },
    ];

    formFields.forEach(field => {
        let value = existingArtist?.[field.id.replace("artist-", "")] ?? "";
        if (field.id === "artist-genres" && existingArtist?.genres) value = existingArtist.genres.join(", ");
        const inputField = createFormGroup({ ...field, value });
        section.appendChild(inputField);
    });

    // ------------------- SOCIAL LINKS SECTION -------------------
    const socialsContainer = createElement("div", { id: "artist-socials-container" });
    const socialsSection = createElement("div", { class: "socials-section" }, [
        createElement("h3", {}, ["Social Links"]),
        socialsContainer,
        Button("Add Social", "add-social-btn", { click: () => addSocialField(null, socialsContainer) },"buttonx secondary")
    ]);
    section.appendChild(socialsSection);

    if (mode === "edit" && existingArtist?.socials) {
        Object.entries(existingArtist.socials).forEach(([platform, url]) => {
            addSocialField({ platform, url }, socialsContainer);
        });
    }

    const submitBtn = Button(mode === "create" ? "Create Artist" : "Update Artist", "artist-submit-btn", {
        click: async (e) => {
            e.preventDefault();
            if (mode === "create") await submitArtistForm(section);
            else await updateArtistForm(artistID, section);
        }
    },"buttonx primary");

    section.appendChild(submitBtn);
    content.appendChild(section);
}

// ------------------- SOCIAL FIELD -------------------
function addSocialField(existingSocial = null, container) {
    const row = createElement("div", { class: "social-field-row" });

    const platformField = createFormGroup({
        type: "text",
        id: `social-platform-${existingSocial?.platform}`,
        label: "Platform",
        required: true,
        value: existingSocial?.platform || "",
        placeholder: "e.g. Instagram"
    });

    const urlField = createFormGroup({
        type: "url",
        id: `social-url-${existingSocial?.platform}`,
        label: "URL",
        required: true,
        value: existingSocial?.url || "",
        placeholder: "https://..."
    });

    const removeBtn = Button("Remove", "", { click: () => container.removeChild(row) }, "remove-social-btn");
    [platformField, urlField, removeBtn].forEach(el => row.appendChild(el));
    container.appendChild(row);
}

// ------------------- FORM DATA COLLECTOR -------------------
function collectFormData(section) {
    const formData = new FormData();

    ["artist-category", "artist-name", "artist-bio", "artist-dob", "artist-place", "artist-country", "artist-genres"].forEach(id => {
        const el = section.querySelector(`#${id}`);
        if (el) formData.append(id.replace("artist-", ""), el.value ?? "");
    });

    // ---- Collect socials as JSON ----
    const socials = {};
    section.querySelectorAll(".social-field-row").forEach(row => {
        const platform = row.querySelector("input[type=text]")?.value.trim().toLowerCase();
        const url = row.querySelector("input[type=url]")?.value.trim();
        if (platform && url) socials[platform] = url;
    });
    if (Object.keys(socials).length > 0) {
        formData.append("socials", JSON.stringify(socials));
    }

    return formData;
}

// ------------------- DELETE ARTIST -------------------
export async function deleteArtistForm(isLoggedIn, artistID, isCreator) {
    if (!isLoggedIn) {
        Notify("You must be logged in to delete an artist.", { type: "warning", duration: 3000 });
        navigate("/login");
        return;
    }

    if (!isCreator) {
        Notify("You are not authorized to delete this artist.", { type: "error", duration: 3000 });
        return;
    }

    const confirmed = confirm("Are you sure you want to delete this artist? This action cannot be undone.");
    if (!confirmed) return;

    try {
        await apiFetch(`/artists/${artistID}`, "DELETE");
        Notify("Artist deleted successfully.", { type: "success", duration: 3000 });
        navigate("/artists");
    } catch (err) {
        Notify(`Failed to delete artist: ${err.message}`, { type: "error", duration: 4000 });
    }
}
