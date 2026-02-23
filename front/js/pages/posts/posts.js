import { displayPosts } from "../../services/posts/PostsService.js";

async function Posts(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayPosts(contentContainer, isLoggedIn);
}

export { Posts };
