import { mereFetch } from "../../api/api";
import { navigate } from "../../routes/index.js";
import { getState } from "../../state/state";
import { userNewChatInit } from "../newchat/newchats.js";


export async function meChat(otherUserId, entityType, entityId) {
    console.log(otherUserId, entityType, entityId);
    const userId = getState("user");
    if (!userId || !otherUserId) return;
    let chat;
    if (entityType == "user") {
        userNewChatInit(otherUserId);
        navigate(`/merechats/${chat.chatid}`);
    } else {
        const participants = [userId, otherUserId];

        chat = await mereFetch("/merechats/start", "POST", {
            participants,
            entityType,
            entityId
        });
        navigate(`/merechats/${chat.chatid}`);
    }
}
