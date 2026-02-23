import { createPostHeader } from "./helpers.js";
import { createActions } from "./actions.js";
import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "../renderImagePost.js";
import { RenderVideoPost } from "../renderVideoPost.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { getState } from "../../../state/state.js";
import { navigate } from "../../../routes/index.js";
import Datex from "../../../components/base/Datex.js";

let activeVideoPlayers = [];

export async function renderPost(posts, postsContainer, postmetadata, isNew) {
    // ---- Cleanup existing players before re-render ----
    if (activeVideoPlayers.length > 0) {
        activeVideoPlayers.forEach(v => {
            if (v && typeof v.cleanup === "function") v.cleanup();
        });
        activeVideoPlayers = [];
    }

    if (!Array.isArray(posts)) posts = [posts];

    const isLoggedIn = Boolean(getState("token"));
    const user = getState("user");

    for (const post of posts) {
        const isCreator = isLoggedIn && user === post.userid;

        const postElement = createElement("article", {
            class: ["feed-item"],
            id: `post-${post.postid}`,
            // "date-is": new Date(post.timestamp).toLocaleString()
            "date-is": Datex(post.timestamp)
        }, [createPostHeader(post)]);

        // --- MEDIA ---
        const mediaContainer = createElement("div", { class: ["post-media"] });
        const mediaUrls = Array.isArray(post.media_url)
            ? post.media_url
            : post.media_url ? [post.media_url] : [];

        if (post.type === "image") {
            RenderImagePost(mediaContainer, mediaUrls);
        } else if (post.type === "video") {
            const media = post.media.map(m => resolveImagePath(EntityType.FEED, PictureType.VIDEO, m));
            const posterPath = resolveImagePath(EntityType.FEED, PictureType.POSTER, `${post.thumbnail || mediaUrls[0]}.png`);
            const players = await RenderVideoPost(mediaContainer, media, mediaUrls, post.resolutions || [], [], posterPath);
            activeVideoPlayers.push(...players);
        } else if (post.text) {
            mediaContainer.appendChild(createElement("p", {}, [post.text]));
        } else {
            mediaContainer.appendChild(createElement("p", {}, ["Unknown post type."]));
        }

        // // click on media navigates to full post
        // mediaContainer.addEventListener("click", () => navigate(`/feedpost/${post.postid}`));
        postElement.appendChild(mediaContainer);

        // --- META ---
        if (post.title || (post.tags?.length)) {
            const metaSection = createElement("div", { class: ["post-meta"] });
            if (post.title) {
                metaSection.appendChild(createElement("h3", { class: ["post-title"] }, [post.title]));
            }
            if (post.tags?.length) {
                const tagsContainer = createElement("nav", { class: ["tags"], "aria-label": "Tags" },
                    post.tags.map(tag =>
                        createElement("a", { href: `/hashtag/${tag}` }, [
                            createElement("span", { class: ["tag"] }, [tag])
                        ])
                    )
                );
                metaSection.appendChild(tagsContainer);
            }
            metaSection.addEventListener("click", () => navigate(`/feedpost/${post.postid}`));
            postElement.appendChild(metaSection);
        }

        // --- ACTIONS ---
        const meta = postmetadata[post.postid] || { likes: 0, comments: 0, likedByUser: false };
        const actionsContainer = await createActions(meta, isCreator, postElement);
        postElement.appendChild(actionsContainer);

        if (isNew == 1) {
            postsContainer.prepend(postElement);
        } else {
            postsContainer.appendChild(postElement);
        }
    }
}

// Expose cleanup if you need it elsewhere
export function cleanupRenderPost() {
    activeVideoPlayers.forEach(v => {
        if (v && typeof v.cleanup === "function") v.cleanup();
    });
    activeVideoPlayers = [];
}
