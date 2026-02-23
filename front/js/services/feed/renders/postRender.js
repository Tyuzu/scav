import { createPostHeader } from "./helpers.js";
import { createActions } from "./actions.js";
import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "../renderImagePost.js";
import { RenderVideoPost } from "../renderVideoPost.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { getState } from "../../../state/state.js";
import Datex from "../../../components/base/Datex.js";

/**
 * Renders a single post (or an array of posts) for a separate page.
 * Expects `metadataMap` keyed by postid.
 */
export async function renderPost(posts, postsContainer, metadataMap = {}) {
    if (!Array.isArray(posts)) posts = [posts];

    const isLoggedIn = Boolean(getState("token"));
    const user = getState("user");

    for (const post of posts) {
        const isCreator = isLoggedIn && user === post.userid;

        // //temporary resolutions
        // post.resolutions = [144, 240, 360, 480, 720, 1080, 1440, 2160];

        const postElement = createElement("article", {
            class: "feed-item",
            id: `post-${post.postid}`,
            // "date-is": new Date(post.timestamp).toLocaleString()
            "date-is": Datex(post.timestamp)
        }, []);

        // --- 1. Media ---
        const mediaContainerId = `post-media-${post.postid}`;
        const mediaContainer = createElement("div", { id: mediaContainerId, class: "post-media" });
        const mediaUrls = Array.isArray(post.media_url) ? post.media_url : (post.media_url ? [post.media_url] : []);

        const renderers = {
            image: () => RenderImagePost(mediaContainer, mediaUrls),
            video: () => {
                const videos = post.media.map(m => resolveImagePath(EntityType.FEED, PictureType.VIDEO, m));
                const videoWrapper = createElement("div", { class: "video-wrapper" });
                const posterPath = resolveImagePath(EntityType.FEED, PictureType.POSTER, `${post.thumbnail || mediaUrls[0]}.png`);
                RenderVideoPost(videoWrapper, videos, mediaUrls, post.resolutions || [], [], posterPath);

                const videoEl = videoWrapper.querySelector("video");
                if (!videoEl) return;

                videoWrapper.dataset.wrapperId = videoWrapper.dataset.wrapperId || `vw-${Math.random().toString(36).slice(2, 9)}`;
                videoWrapper.dataset.originalContainerId = mediaContainerId;

                mediaContainer.appendChild(videoWrapper);
            },
            text: () => mediaContainer.appendChild(createElement("p", {}, [post.text || ""]))
        };

        (renderers[post.type] || (() => mediaContainer.appendChild(createElement("p", {}, ["Unknown post type."]))))();
        postElement.appendChild(mediaContainer);

        // --- 2. Meta Section ---
        const metaContainer = createElement("div", { class: "post-media-meta" });
        if (post.title) metaContainer.appendChild(createElement("h3", { class: "post-title" }, [post.title]));

        if (post.tags?.length) {
            const tagsContainer = createElement("div", { class: "tags" },
                post.tags.map(tag => createElement("a", { href: `/hashtag/${tag}`, class: "tag-link" }, [
                    createElement("span", { class: "tag" }, [tag])
                ]))
            );
            metaContainer.appendChild(tagsContainer);
        }

        if (post.description) {
            const maxLength = 180;
            const fullText = post.description;
            const isLong = fullText.length > maxLength;
            const shortText = isLong ? fullText.slice(0, maxLength) + "..." : fullText;

            const descText = createElement("p", { class: "desc-text" }, [shortText]);
            const descriptionEl = createElement("div", { class: "post-description" }, [descText]);

            if (isLong) {
                const toggleBtn = createElement("button", { class: "desc-toggle" }, ["Show more"]);
                toggleBtn.addEventListener("click", () => {
                    const expanded = toggleBtn.innerText === "Show less";
                    descText.innerText = expanded ? shortText : fullText;
                    toggleBtn.innerText = expanded ? "Show more" : "Show less";
                });
                descriptionEl.appendChild(toggleBtn);
            }

            metaContainer.appendChild(descriptionEl);
        }

        postElement.appendChild(metaContainer);

        // --- 3. Header + Actions ---
        const headerActionsRow = createElement("div", { class: "hvflex-sb post-header-actions" }, []);
        const header = createPostHeader(post);

        // Lookup metadata for this post
        const metadata = metadataMap[post.postid] || { likes: 0, comments: 0, likedByUser: false };
        const actions = await createActions(metadata, isCreator, postElement);

        headerActionsRow.appendChild(header);
        headerActionsRow.appendChild(actions);
        postElement.appendChild(headerActionsRow);

        // Append to container
        postsContainer.appendChild(postElement);
    }
}
