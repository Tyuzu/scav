import { createElement } from "../../../components/createElement.js";
import { fetchMedia } from "../api/mediaApi.js";
import { showMediaUploadForm } from "./mediaUploadForm.js";
import {
  lazyMediaObserver,
  clear,
  groupMedia,
  createAddMediaButton,
  createMediaActions,
  confirmDelete,
  buildTranslationSection
} from "../../media/mediaCommon.js";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import { generateVideoPlayer } from "../../../components/ui/vidpopHelpers.js";
import LightBox from "../../../components/ui/Lightbox.mjs";
import Sightbox from "../../../components/ui/Sightbox_zoom.mjs";

function buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, prefix = "media") {
  const frag = document.createDocumentFragment();
  const grouped = groupMedia(mediaData);

  for (const group of grouped) {
    const wrapper = createElement("div", { class: `${prefix}-group` });

    group.forEach((media, i) => {
      if (!media.url) {
return;
}

      const figure = createElement("figure", {
        class: `${prefix}-item`,
        "data-id": media.mediaid
      });

      const thumbSrc = resolveImagePath(EntityType.MEDIA, PictureType.THUMB, `${media.url}.jpg`);
      const mediaEl = buildMediaElement(media, thumbSrc, i, prefix);

      figure.append(mediaEl);

      // ✅ Only add caption + translation if caption exists
      if (media.caption && media.caption.trim() !== "") {
        const caption = createElement("figcaption", { class: `${prefix}-caption` }, [media.caption]);
        // const translation = buildTranslationSection(media.caption);
        const translation = buildTranslationSection(media.caption, media.captionlang);

        figure.append(caption);
        if (translation) {
figure.append(...translation);
}
      }

      const actions = createMediaActions(media, entityType, entityId, isLoggedIn, confirmDelete, prefix);
      figure.append(actions);

      wrapper.append(figure);
    });

    frag.append(wrapper);
  }

  return frag;
}


/* ------------------------------------------------------
   MEDIA ELEMENT BUILDER
------------------------------------------------------ */

function buildMediaElement(media, thumbSrc, index, prefix) {
  if (media.type === "image") {
    const img = Imagex({
      "data-src": thumbSrc,
      classes: `${prefix}-img`,
      "data-index": index
    });
    img.addEventListener("click", () => Sightbox(thumbSrc, "image"));
    lazyMediaObserver.observe(img);
    return img;
  }

  if (media.type === "video") {
    const videoSrc = resolveImagePath(EntityType.MEDIA, PictureType.VIDEO, `${media.url}${media.extn || ".mp4"}`);
    const img = Imagex({
      src: thumbSrc,
      classes: `${prefix}-img`,
      "data-index": index
    });

    const vidEl = createElement("div", {}, []);

    generateVideoPlayer(videoSrc, thumbSrc, [], [], media.url).then(videoPlayer => {
      vidEl.appendChild(videoPlayer);
    });

    img.addEventListener("click", () => {
      const container = createElement("div", { class: "lightbox-video-container" }, [vidEl]);
      LightBox(container);
    });

    return img;
  }

  return createElement("div", { class: `${prefix}-unsupported` }, [`Unsupported media type: ${media.type}`]);
}

/* ------------------------------------------------------
   DISPLAY GALLERY
------------------------------------------------------ */

export async function displayFanMedia(content, entityType, entityId, isLoggedIn) {
  clear(content);

  // const title = createElement("h2", { class: "fanmade-title" }, ["Fanmade Gallery"]);
  const loader = createElement("p", { class: "loading" }, ["Loading media..."]);
  const list = createElement("div", { class: "fanmade-list" });
  // content.append(title, loader);
  content.append(loader);

  try {
    const mediaData = await fetchMedia(entityType, entityId);
    loader.remove();

    if (!Array.isArray(mediaData) || mediaData.length === 0) {
      content.append(createElement("p", {}, ["No media available."]));
      const addBtn = createAddMediaButton(isLoggedIn, entityType, entityId, list, showMediaUploadForm);
      if (addBtn) {
content.append(addBtn);
}
      return;
    }

    const frag = buildMediaFragment(mediaData, entityType, entityId, isLoggedIn, "fanmade");
    list.append(frag);

    const addBtn = createAddMediaButton(isLoggedIn, entityType, entityId, list, showMediaUploadForm);
    if (addBtn) {
content.append(addBtn);
}

    content.append(list);

    list.addEventListener("click", e => {
      const img = e.target.closest(".fanmade-img");
      if (img) {
return;
}
    });
  } catch (err) {
    console.error("Fan media fetch error:", err);
    loader.replaceWith(createElement("p", { class: "error" }, ["Failed to load fan media."]));
  }
}
