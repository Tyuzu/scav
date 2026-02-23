import { createPost } from "../../services/posts/createOrEditPost.js";

async function CreatePost(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createPost(isLoggedIn, contentContainer);
}

export { CreatePost };
