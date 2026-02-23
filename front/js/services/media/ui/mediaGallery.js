import { createElement } from "../../../components/createElement.js";
import { fetchMedia } from "../api/mediaApi.js";
import { showMediaUploadForm } from "./mediaUploadForm.js";
import Notify from "../../../components/ui/Notify.mjs";
import {
  lazyMediaObserver,
  clear,
  groupMedia,
  createAddMediaButton,
  createMediaActions,
  confirmDelete
} from "../mediaCommon.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import { handleTranslationToggle } from "../../fanmade/translate.js";
import Sightbox from "../../../components/ui/Sightbox_zoom.mjs";
import LightBox from "../../../components/ui/Lightbox.mjs";
import { generateVideoPlayer } from "../../../components/ui/vidpopHelpers.js";

/* ------------------------------------------------------
   Helper: Determine media type
------------------------------------------------------ */
function getFileType(media) {
  if (!media || !media.type) {
    if (media.url && /\.(mp4|webm|ogg)$/i.test(media.url)) return "video";
    if (media.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(media.url)) return "image";
    return "unknown";
  }
  if (media.type.startsWith("image")) return "image";
  if (media.type.startsWith("video")) return "video";
  return "unknown";
}

/* ------------------------------------------------------
   BUILD MEDIA FRAGMENT
------------------------------------------------------ */
function buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, prefix = "media") {
  const frag = document.createDocumentFragment();
  const grouped = groupMedia(mediaData);

  grouped.forEach(group => {
    const wrapper = createElement("div", { class: `${prefix}-group` });

    group.forEach((media, i) => {
      if (!media.url) return;

      const mediaType = getFileType(media);
      const figure = createElement("figure", {
        class: `${prefix}-item`,
        "data-id": media.mediaid
      });

      const thumbSrc = resolveImagePath(EntityType.MEDIA, PictureType.THUMB, `${media.url}.jpg`);
      const captionText = media.caption || "";
      const mediaEl = buildMediaElement(media, thumbSrc, i, prefix, mediaType);
      const caption = createElement("figcaption", { class: `${prefix}-caption` }, [captionText]);

      const translation = buildTranslationSection(captionText);
      const actions = createMediaActions(media, entityType, entityId, isLoggedIn, confirmDelete, prefix);

      figure.append(mediaEl, caption);
      if (translation) figure.append(...translation);
      figure.append(actions);

      wrapper.append(figure);
    });

    frag.append(wrapper);
  });

  return frag;
}

/* ------------------------------------------------------
   MEDIA ELEMENT BUILDER
------------------------------------------------------ */
function buildMediaElement(media, thumbSrc, index, prefix, type) {
  if (type === "image") {
    const img = Imagex({
      "data-src": thumbSrc,
      classes: `${prefix}-img`,
      "data-index": index
    });
    img.addEventListener("click", () => Sightbox(thumbSrc, "image"));
    lazyMediaObserver.observe(img);
    return img;
  }

  if (type === "video") {
    const videoSrc = resolveImagePath(
      EntityType.MEDIA,
      PictureType.VIDEO,
      `${media.url}${media.extn || ".mp4"}`
    );

    const img = Imagex({
      src: thumbSrc,
      classes: `${prefix}-img`,
      "data-index": index
    });

    const vidEl = createElement("div", { class: `${prefix}-video-wrapper` }, []);

    // Load video player lazily
    generateVideoPlayer(videoSrc, thumbSrc, [], [], media.url)
      .then(videoPlayer => {
        if (videoPlayer) vidEl.append(videoPlayer);
      })
      .catch(err => {
        console.error("Video load error:", err);
        vidEl.append(
          createElement("p", { class: "video-error" }, ["Failed to load video."])
        );
      });

    img.addEventListener("click", () => {
      const container = createElement("div", { class: "lightbox-video-container" }, [vidEl]);
      LightBox(container);
    });

    return img;
  }

  return createElement("div", { class: `${prefix}-unsupported` }, [
    `Unsupported media type: ${type}`
  ]);
}

/* ------------------------------------------------------
   TRANSLATION TOGGLE BUILDER
------------------------------------------------------ */
function buildTranslationSection(captionText) {
  if (!captionText) return null;

  const translationBox = createElement("div", {
    class: "translation-container",
    style: "display:none;"
  });

  const toggle = createElement(
    "span",
    {
      class: "translate-toggle",
      "data-state": "original"
    },
    ["See Translation"]
  );

  toggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    await handleTranslationToggle(toggle, captionText, translationBox);
  });

  return [toggle, translationBox];
}

/* ------------------------------------------------------
   DISPLAY MEDIA GALLERY
------------------------------------------------------ */
export async function displayMedia(content, entityType, entityId, isLoggedIn) {
  clear(content);

  const title = createElement("h2", {}, ["Media Gallery"]);
  const loader = createElement("p", { class: "loading" }, ["Loading media..."]);
  const list = createElement("div", { class: "media-list" });

  const addBtn = createAddMediaButton(isLoggedIn, entityType, entityId, list, showMediaUploadForm);
  if (addBtn) content.append(addBtn);

  // Append upfront to minimize layout shifts
  content.append(title, loader, list);

  try {
    const mediaData = await fetchMedia(entityType, entityId);
    loader.remove();

    if (!Array.isArray(mediaData) || mediaData.length === 0) {
      content.append(createElement("p", {}, ["No media available."]));
      return;
    }

    const frag = buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, "media");
    list.append(frag);

    // Reserved for delegated interactions
    list.addEventListener("click", e => {
      const img = e.target.closest(".media-img");
      if (img) return;
    });
  } catch (err) {
    console.error("Media fetch error:", err);
    loader.replaceWith(
      createElement("p", { class: "error" }, ["Failed to load media."])
    );
  }
}
