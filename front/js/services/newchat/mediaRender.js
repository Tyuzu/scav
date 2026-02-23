import { RenderImagePost } from "./renders/renderImagePost.js";
import { RenderVideoPost } from "./renders/renderVideoPost.js";
import { RenderAudioPost } from "./renders/renderAudioPost.js";
import { createElement } from "../../components/createElement.js";

/**
 * Create chat-friendly media content
 * Wraps feed renderers into a bubble for chat messages
 * @param {Object} post - metadata { type: "image"|"video"|"audio"|"file" }
 * @param {Array<string>} media - list of media URLs
 * @param {boolean} isOwn - whether the message is sent by current user
 * @returns {Promise<HTMLElement>} chat bubble
 */
async function createChatContent(post, media = [], isOwn = false) {
  const bubble = createElement("section", {
    class: `chat-bubble ${isOwn ? "chat-own" : "chat-other"}`,
    role: "group",
    "aria-label": `${post.type} message`
  });

  const mediaContainer = createElement("figure", {
    class: "chat-media",
    "aria-label": `${post.type} attachment`
  });

  if (!Array.isArray(media) || media.length === 0) {
    bubble.textContent = post.content || "";
    return bubble;
  }

  switch (post.type) {
    case "image":
      await RenderImagePost(
        mediaContainer,
        media.map((url, i) => ({ src: url, alt: `Image ${i + 1} in message` }))
      );
      break;

    case "video":
      await RenderVideoPost(mediaContainer, media, {
        controls: true,
        "aria-label": "Video message"
      });
      break;

    case "audio":
      await RenderAudioPost(mediaContainer, media[0], {
        controls: true,
        "aria-label": "Audio message"
      });
      break;

    default:
      media.forEach(url => {
        const link = createElement(
          "a",
          {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "chat-file-link",
            "aria-label": "Download attached file"
          },
          ["Download file"]
        );
        mediaContainer.appendChild(link);
      });
  }

  bubble.appendChild(mediaContainer);
  return bubble;
}

export { createChatContent };
