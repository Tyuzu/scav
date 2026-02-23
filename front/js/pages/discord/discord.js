import { displayDiscord} from "../../services/discord/discord.js";

async function Discord(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayDiscord(contentContainer, isLoggedIn);
}

export { Discord };
