import "../../../css/ui/SightboxZoom.css";
import { createZoomableMedia } from "./createZoomableMedia";
import { createElement } from "../domUtils.js";
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";
import { createFocusTrap } from "../utils/focusTrap.js";

/**
 * Sightbox - Modal lightbox for viewing images/videos with optional zoom
 * @param {string} mediaSrc - Source URL of the media
 * @param {Object} options - Configuration options
 * @param {string} options.mediaType - Type of media: "image" or "video" (default: "image")
 * @param {boolean} options.enableZoom - Enable zoom/pan features (default: true)
 * @returns {HTMLElement} Sightbox container element
 *
 * @example
 * const sightbox = Sightbox("image.jpg", { mediaType: "image", enableZoom: true });
 * sightbox.open();
 */
function Sightbox(mediaSrc, options = {}) {
  const {
    mediaType = "image",
    enableZoom = true
  } = typeof options === "string" ? { mediaType: options } : options;

  if (document.getElementById("sightbox")) {
    console.warn("Sightbox is already open");
    return null;
  }

  let focusTrap = null;
  const previouslyFocused = document.activeElement;
  const appContainer = document.getElementById("app");

  if (!appContainer) {
    console.error("App container not found");
    return null;
  }

  const closeHandler = () => closeSightbox();

  const overlay = createElement("div", { 
    class: "sightboxz-overlay", 
    events: { click: closeHandler } 
  });

  let contentChildren;
  if (enableZoom) {
    const { container, mediaEl, resetZoomBtn } = createZoomableMedia(mediaSrc, mediaType);
    contentChildren = [container, closeButton, resetZoomBtn];
  } else {
    let mediaEl;
    if (mediaType === "image") {
      mediaEl = createElement("img", {
        src: mediaSrc,
        alt: "Sightbox Image",
        class: "sightbox-media"
      });
    } else if (mediaType === "video") {
      mediaEl = createElement("video", {
        src: mediaSrc,
        controls: true,
        muted: true,
        class: "sightbox-media"
      });
    }
    contentChildren = [mediaEl, closeButton];
  }

  const closeButton = createIconButton({
    classSuffix: "sightboxz-close",
    svgMarkup: xSVG,
    onClick: closeHandler,
    label: "",
    ariaLabel: "Close"
  });

  const content = createElement("div", { 
    class: "sightboxz-content", 
    role: "dialog",
    "aria-modal": "true",
    tabindex: "-1" 
  }, contentChildren);

  const sightbox = createElement("div", { 
    id: "sightbox", 
    class: "sightboxz" 
  }, [overlay, content]);

  appContainer.appendChild(sightbox);
  content.focus();

  focusTrap = createFocusTrap(content, {
    closeOnEscape: true,
    onEscape: closeSightbox,
    focusSelector: "[tabindex], button, [href], input, select, textarea"
  });

  function closeSightbox() {
    if (!document.body.contains(sightbox)) return;

    if (focusTrap) {
      focusTrap.cleanup();
    }

    sightbox.classList.add("fade-out");
    setTimeout(() => {
      sightbox.remove();
      previouslyFocused?.focus?.();
    }, 300);
  }

  return Object.freeze({
    element: sightbox,
    content: content,
    close: closeSightbox,
    cleanup: closeSightbox
  });
}

export default Sightbox;
