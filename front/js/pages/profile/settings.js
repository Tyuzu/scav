import { displaySettings } from "../../services/usersettings/settingsService.js";

async function Settings(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displaySettings(isLoggedIn, contentContainer);
}

export { Settings };
