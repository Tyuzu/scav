import { displayChannelPage } from "../../services/discord/displayChannelPage.js";

async function DiscordChannel(isLoggedIn, serverid, channelid, contentContainer) {
    contentContainer.innerHTML = '';
    displayChannelPage(contentContainer, serverid, channelid, isLoggedIn);
}

export { DiscordChannel };