import { displayCreatorLive } from "../../services/vlive/creator/creatorLive.js";

async function Vlive(isLoggedIn, entity, entityId, liveid, contentContainer) {
    displayCreatorLive(isLoggedIn, entity, entityId, liveid, contentContainer)
}


export { Vlive };
