import { createPostHeader } from "./helpers.js";
import { createActions } from "./actions.js";
import { createElement } from "../../../components/createElement.js";
import { RenderImagePost } from "../renderImagePost.js";
import { RenderVideoPost } from "../renderVideoPost.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { getState } from "../../../state/state.js";
import Datex from "../../../components/base/Datex.js";

/**
 * Renders one or more posts into a container.
 * @param {Object|Object[]} posts
 * @param {HTMLElement} postsContainer
 * @param {Object} metadataMap - keyed by postId
 */
export async function renderPost(posts, postsContainer, metadataMap = {}) {
    try {
        if (!postsContainer) {
            throw new Error("postsContainer is required");
        }

        if (!Array.isArray(posts)) {
            posts = [posts];
        }

        const isLoggedIn = Boolean(getState("token"));
        const user = getState("user");

        for (const post of posts) {
            try {
                if (!post || !post.postid) {
                    console.warn("Skipping invalid post:", post);
                    continue;
                }

                const isCreator = isLoggedIn && user === post.userid;

                const postElement = createElement("article", {
                    class: "feed-item",
                    id: `post-${post.postid}`,
                    "date-is": safeDate(post.timestamp)
                });

                // ---------- MEDIA ----------
                const mediaContainerId = `post-media-${post.postid}`;
                const mediaContainer = createElement("div", {
                    id: mediaContainerId,
                    class: "post-media"
                });

                const media = normalizeMedia(post);

                const renderers = {
                    image: () => {
                        if (media.length) {
                            RenderImagePost(mediaContainer, media);
                        } else {
                            fallbackText(mediaContainer, "No image available.");
                        }
                    },

                    video: () => {
                        if (!media.length) {
                            fallbackText(mediaContainer, "No video available.");
                            return;
                        }

                        const videoWrapper = createElement("div", {
                            class: "video-wrapper"
                        });

                        const videos = media.map(m =>
                            resolveImagePath(EntityType.FEED, PictureType.VIDEO, m)
                        );

                        const posterPath = resolveImagePath(
                            EntityType.FEED,
                            PictureType.POSTER,
                            `${post.thumbnail || media[0]}.png`
                        );

                        try {
                            RenderVideoPost(
                                videoWrapper,
                                videos,
                                media,
                                post.resolutions || [],
                                [],
                                posterPath
                            );
                        } catch (err) {
                            console.error("RenderVideoPost failed:", err);
                            fallbackText(mediaContainer, "Video failed to load.");
                            return;
                        }

                        const videoEl = videoWrapper.querySelector("video");
                        if (!videoEl) {
                            console.warn(`No video element for post ${post.postid}`);
                            fallbackText(mediaContainer, "Video unavailable.");
                            return;
                        }

                        videoWrapper.dataset.wrapperId = `vw-${post.postid}`;
                        videoWrapper.dataset.originalContainerId = mediaContainerId;

                        mediaContainer.appendChild(videoWrapper);
                    },

                    text: () => {
                        fallbackText(mediaContainer, post.text || "");
                    }
                };

                const render = renderers[post.type] || renderers.text;
                render();

                postElement.appendChild(mediaContainer);

                // ---------- META ----------
                const metaContainer = createElement("div", {
                    class: "post-media-meta"
                });

                if (post.title) {
                    metaContainer.appendChild(
                        createElement("h3", { class: "post-title" }, [post.title])
                    );
                }

                if (Array.isArray(post.tags) && post.tags.length) {
                    const tagsContainer = createElement(
                        "div",
                        { class: "tags" },
                        post.tags.map(tag =>
                            createElement("a", {
                                href: `/hashtag/${tag}`,
                                class: "tag-link"
                            }, [
                                createElement("span", { class: "tag" }, [tag])
                            ])
                        )
                    );
                    metaContainer.appendChild(tagsContainer);
                }

                if (post.description) {
                    metaContainer.appendChild(createDescription(post.description));
                }

                postElement.appendChild(metaContainer);

                // ---------- HEADER + ACTIONS ----------
                const headerActionsRow = createElement("div", {
                    class: "hvflex-sb post-header-actions"
                });

                const header = createPostHeader(post);

                const metadata = normalizeMetadata(
                    metadataMap[post.postid],
                    post.postid
                );

                let actions;
                try {
                    actions = await createActions(metadata, isCreator, postElement);
                } catch (err) {
                    console.error("createActions failed:", err);
                    actions = createElement("div", {}, [""]);
                }

                headerActionsRow.appendChild(header);
                headerActionsRow.appendChild(actions);
                postElement.appendChild(headerActionsRow);

                postsContainer.appendChild(postElement);
            } catch (err) {
                console.error("Error rendering post:", post, err);
            }
        }
    } catch (err) {
        console.error("renderPost failed:", err);
    }
}

/* ----------------- HELPERS ----------------- */

function normalizeMedia(post) {
    const media = post.media ?? post.media_url ?? [];
    return Array.isArray(media) ? media : [media];
}

function normalizeMetadata(metadata, postId) {
    return {
        postId,
        likes: metadata?.likes ?? 0,
        comments: metadata?.comments ?? 0,
        likedByUser: metadata?.likedByUser ?? false
    };
}

function safeDate(timestamp) {
    try {
        return timestamp ? Datex(timestamp) : "";
    } catch {
        return "";
    }
}

function fallbackText(container, text) {
    container.appendChild(createElement("p", {}, [text]));
}

function createDescription(fullText) {
    const maxLength = 180;
    const isLong = fullText.length > maxLength;
    const shortText = isLong
        ? fullText.slice(0, maxLength) + "..."
        : fullText;

    const descText = createElement("p", { class: "desc-text" }, [shortText]);
    const wrapper = createElement("div", { class: "post-description" }, [descText]);

    if (!isLong) {
        return wrapper;
    }

    let expanded = false;

    const toggleBtn = createElement("button", {
        class: "desc-toggle"
    }, ["Show more"]);

    toggleBtn.addEventListener("click", () => {
        expanded = !expanded;
        descText.innerText = expanded ? fullText : shortText;
        toggleBtn.innerText = expanded ? "Show less" : "Show more";
    });

    wrapper.appendChild(toggleBtn);
    return wrapper;
}