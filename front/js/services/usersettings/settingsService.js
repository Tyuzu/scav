import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import {
    createContainer,
    createLoadingIndicator,
    createErrorContainer,
    createSettingForm
} from "./settingsHelpers.js";

async function loadSettings() {
    try {
        const settings = await apiFetch("/settings/all");
        if (!Array.isArray(settings) || settings.length === 0) {
            return getDefaultSettings();
        }
        return settings;
    } catch (error) {
        console.error("Error fetching settings:", error);
        return getDefaultSettings();
    }
}

function getDefaultSettings() {
    return [
        { type: "theme", value: "light", description: "Choose theme mode" },
        { type: "notifications", value: true, description: "Enable notifications" },
        { type: "privacy_mode", value: false, description: "Enable privacy mode" },
        { type: "auto_logout", value: false, description: "Enable auto logout" },
        { type: "language", value: "english", description: "Select language" },
        { type: "time_zone", value: "UTC", description: "Select time zone" },
        { type: "daily_reminder", value: "09:00", description: "Set daily reminder" },
    ];
}

async function displaySettings(isLoggedIn, settingsSec) {
    if (!isLoggedIn) {
        navigate("/login");
        return;
    }

    const settingsContainer = createContainer();
    settingsSec.replaceChildren();
    settingsSec.appendChild(settingsContainer);

    const loadingIndicator = createLoadingIndicator();
    const errorContainer = createErrorContainer();

    settingsContainer.appendChild(loadingIndicator);
    settingsContainer.appendChild(errorContainer);

    try {
        const settings = await loadSettings();
        settingsContainer.replaceChildren();

        settings.forEach((setting) => {
            settingsContainer.appendChild(createSettingForm(setting));
        });
    } catch (error) {
        console.error("Error loading settings:", error);
        errorContainer.textContent = `Failed to load settings: ${error.message}`;
    } finally {
        loadingIndicator.style.display = "none";
    }
}

export { displaySettings };
