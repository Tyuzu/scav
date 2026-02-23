import { displayHashtag } from "../../services/hashtag/hashtagService.js";

async function Hashtag(isLoggedIn, hashtag, contentContainer) {
    contentContainer.innerHTML = '';
    displayHashtag(contentContainer, hashtag, isLoggedIn);
}

export { Hashtag };
