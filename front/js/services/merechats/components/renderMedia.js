import { createElement } from "../../../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { RenderImagePost } from "./renderImagePost.js";
import { RenderAudioPost } from "./renderAudioPost.js";
import { RenderVideoPost } from "./renderVideoPost.js";

export function renderMedia(msg) {
  const media = msg?.media;
  if (!media) {
return null;
}

  const container = createElement("div", { class: "mediacon" }, []);
  const items = Array.isArray(media) ? media : [media];
  const imageIds = [];

  try {
    for (const m of items) {
      const raw = String(m.url || "").trim();
      if (!raw) {
continue;
}

      const type = String(m.mimeType || m.type || "").toLowerCase();

      if (type.startsWith("image/") || m.type === "image") {
        imageIds.push(raw.replace(/\.(png|jpg|jpeg|webp)$/i, ""));
        continue;
      }

      if (type.startsWith("video/") || m.type === "video") {
        RenderVideoPost(container, [raw], raw, m.extn || "");
        continue;
      }

      if (type.startsWith("audio/") || m.type === "audio") {
        RenderAudioPost(container, raw);
        continue;
      }

      const href = raw.startsWith("http")
        ? raw
        : resolveImagePath(EntityType.CHAT, PictureType.PHOTO, raw);

      container.appendChild(
        createElement("a", { href, download: "", class: "msg-file" }, [raw])
      );
    }

    if (imageIds.length) {
      RenderImagePost(container, imageIds);
    }
  } catch (e) {
    console.error("renderMedia:", e);
    container.appendChild(
      createElement("div", { class: "media-error" }, ["[media error]"])
    );
  }

  return container.children.length ? container : null;
}
