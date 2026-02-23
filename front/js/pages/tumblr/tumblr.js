import { displayTumblr } from "../../services/tumblr/tumblr.js";

async function Tumblr(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayTumblr(isLoggedIn, contentContainer);
}

export { Tumblr };
