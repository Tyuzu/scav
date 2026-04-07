import { getState } from "../../../state/state.js";
import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Notify from "../../../components/ui/Notify.mjs";
import Imagex from "../../../components/base/Imagex.js";
import { toggleAction } from "../../beats/toggleFollows.js";
import Datex from "../../../components/base/Datex.js";

// Helper to turn an SVG string into a Node
export const svgToNode = (svgString) => {
    const template = document.createElement("template");
    template.innerHTML = svgString.trim();
    return template.content.firstChild;
};

export function createPostHeader(post) {
    const userPicUrl = resolveImagePath(EntityType.USER, PictureType.THUMB, `${post.userid}.jpg`);

    const img = Imagex({
        loading: "lazy",
        src: userPicUrl,
        // alt: "Profile Picture",
        class: "profile-thumb",
    });

    const userIconLink = createElement("a", {
        href: `/user/${post.username}`,
        class: "user-icon"
    }, [img]);

    // Format timestamp
    let formattedTime = "";
    if (post.timestamp) {
        formattedTime = Datex(post.timestamp);
    }


    const usernameDiv = createElement("div", { class: "username" }, [post.username]);
    const timestampDiv = createElement("div", { class: "timestamp" }, [formattedTime]);

    const userTimeDiv = createElement("div", { class: "user-time" }, [
        usernameDiv,
        timestampDiv
    ]);

    
    const headerRow = createElement("div", { class: "post-header hflex" }, [
        userIconLink,
        userTimeDiv
    ]);
    
    // if (subscribeBtn) {
    //     headerRow.appendChild(subscribeBtn);
    // }

    return headerRow;
}

/**
 * Subscribe to a feed post
 */
function SubscribeToFeedPost(followBtn, postId) {
    toggleAction({
        entityId: postId,
        entityType: "feedpost",
        button: followBtn,
        apiPath: "/subscribes/",
        labels: { on: "Unsubscribe", off: "Subscribe" },
        actionName: "subscribed"
    });
}

// Batch fetch: POST /likes/:entitytype/batch/users
export async function fetchUserMetaLikesBatch(entityType, entityIds = []) {
    if (!Array.isArray(entityIds) || entityIds.length === 0) {
return {};
}

    try {
        const response = await apiFetch(`/likes/${entityType}/batch/users`, "POST", {
            entity_ids: entityIds
        });

        if (response && response.data && typeof response.data === "object") {
            return response.data;
        }

        return {};
    } catch (err) {
        console.error("fetchUserMetaLikesBatch error:", err);
        return {};
    }
}

/**
 * Update timeline styles for each feed item
 */
export function updateTimelineStyles() {
    document.querySelectorAll(".feed-item").forEach(item => {
        const profileImg = item.querySelector(".profile-thumb")?.src || "";
        item.style.setProperty("--after-bg", `url(${profileImg})`);
    });

    const style = document.createElement("style");
    style.textContent = `.feed-item::after { background-image: var(--after-bg); }`;
    document.head.appendChild(style);
}

/**
 * Delete a post
 */
export async function deletePost(postId, postElement, posts) {
    if (!getState("token")) {
        Notify("Please log in to delete your post.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    if (confirm("Are you sure you want to delete this post?")) {
        try {
            await apiFetch(`/feed/post/${postId}`, "DELETE");
            Notify("Post deleted successfully.", { type: "success", duration: 3000, dismissible: true });

            if (postElement && postElement.parentNode) {
                postElement.parentNode.removeChild(postElement);
            }

            if (Array.isArray(posts) && posts.length > 0) {
                const index = posts.findIndex(p => p.postid === postId);
                if (index !== -1) {
                    posts.splice(index, 1);
                }
            }
        } catch (err) {
            Notify(`Error deleting post: ${err.message}`, { type: "error", duration: 3000, dismissible: true });
        }
    }
}
