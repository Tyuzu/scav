
import { displayOneChat } from "../../services/merechats/onechat";

async function OneChatPage(isLoggedIn, chatid, contentContainer) {
    contentContainer.innerHTML = '';
    displayOneChat(contentContainer, chatid, isLoggedIn);
}

export { OneChatPage };