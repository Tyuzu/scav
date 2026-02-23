import { createElement } from "../../components/createElement.js";
import { renderPost } from "./renders/postRender.js";
import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";
import { getState } from "../../state/state.js";

async function displayPost(isLoggedIn, postId, contentContainer) {
    if (!contentContainer) {
        contentContainer = document.getElementById("content");
    }

    clearContainer(contentContainer);
    contentContainer.appendChild(createElement("p", {}, ["Loading post..."]));
    try {
        const postData = await apiFetch(`/feed/post/${postId}`);

        clearContainer(contentContainer);

        let containerx = createElement("div",{id:"feedpostcon"},[]);
        contentContainer.appendChild(containerx);

        const isAuthor = getState("user") === postData.userid;
        renderPost(postData, containerx, 0, { editable: isAuthor });

    } catch (error) {
        clearContainer(contentContainer);

        if (error.message === "404") {
            contentContainer.appendChild(
                createElement("h1", {}, ["Post not found"])
            );
        } else {
            Notify("Failed to load post details. Please try again later.", {
                type: "error",
                duration: 3000,
                dismissible: true
            });
        }
    }
}

function clearContainer(container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

export { displayPost };
