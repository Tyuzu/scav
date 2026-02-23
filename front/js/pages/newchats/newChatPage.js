
import { displayNewChat } from "../../services/newchat/displayNewchat";

async function NewChatPage(isLoggedIn, chatid, contentContainer) {
    contentContainer.innerHTML = '';
    displayNewChat(contentContainer, chatid, isLoggedIn);
}

export { NewChatPage };