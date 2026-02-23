import "../../../css/ui/ZoomBox.css";
import {
    createOverlay,
    createImageElement,
    createVideoElement,
    applyDarkMode,
    preloadImages,
    updateTransform,
    smoothZoom,
    handleMouseDown,
    createNavigationButtons,
    createCloseButton,
    createZoomButtons,
    handleKeyboard
} from "./zoomboxHelpers.js";
import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";

// Detect media type by file extension
function getMediaType(src) {
    const lower = src.toLowerCase();
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) return "video";
    return "image";
}

// Main ZoomBox factory
const ZoomBox = (mediaItems, initialIndex = 0) => {
    if (!Array.isArray(mediaItems) || mediaItems.length === 0) return;
    if (document.getElementById("zoombox")) return;

    const state = {
        zoomLevel: 1,
        panX: 0,
        panY: 0,
        angle: 0,
        flip: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        velocityX: 0,
        velocityY: 0,
        lastTap: 0,
        currentIndex: Math.max(0, Math.min(initialIndex, mediaItems.length - 1)),
        currentMedia: null,
        mediaType: null
    };

    const zoombox = createOverlay();
    zoombox.id = "zoombox";
    zoombox.setAttribute("role", "dialog");
    zoombox.setAttribute("aria-modal", "true");
    applyDarkMode(zoombox);

    const content = document.createElement("div");
    content.setAttribute("data-zoombox-content", "");
    content.setAttribute("tabindex", "-1");
    content.style.outline = "none";

    // --- Media renderer ---
    const renderMedia = (index) => {
        // Cleanup previous listeners
        if (state.currentMedia && state.currentMedia._cleanupListeners) {
            state.currentMedia._cleanupListeners();
        }
        if (state.currentMedia) state.currentMedia.remove();

        const src = mediaItems[index];
        const type = getMediaType(src);
        state.mediaType = type;

        const element = type === "video"
            ? createVideoElement(src)
            : createImageElement(src);

        // Setup image-specific interactions
        if (type === "image") {
            const onWheel = (e) => smoothZoom(e, element, state, zoombox);
            const onDown = (e) => handleMouseDown(e, state, element);

            element.addEventListener("wheel", onWheel, { passive: false });
            element.addEventListener("mousedown", onDown);

            // Cleanup helper
            element._cleanupListeners = () => {
                element.removeEventListener("wheel", onWheel);
                element.removeEventListener("mousedown", onDown);
            };

            preloadImages(mediaItems, index);
        }

        content.insertBefore(element, closeBtn);
        state.currentMedia = element;

        dispatchZoomBoxEvent("mediachange", { index, src, type });
    };

    // --- Initial render ---
    const initialSrc = mediaItems[state.currentIndex];
    const initialType = getMediaType(initialSrc);
    const media = initialType === "video"
        ? createVideoElement(initialSrc)
        : createImageElement(initialSrc);

    state.mediaType = initialType;
    state.currentMedia = media;

    if (initialType === "image") {
        const onWheel = (e) => smoothZoom(e, media, state, zoombox);
        const onDown = (e) => handleMouseDown(e, state, media);
        media.addEventListener("wheel", onWheel, { passive: false });
        media.addEventListener("mousedown", onDown);
        media._cleanupListeners = () => {
            media.removeEventListener("wheel", onWheel);
            media.removeEventListener("mousedown", onDown);
        };
        preloadImages(mediaItems, state.currentIndex);
    }

    content.appendChild(media);

    // --- Navigation buttons ---
    if (mediaItems.length > 1) {
        const [prevBtn, nextBtn] = createNavigationButtons(
            mediaItems,
            media,
            state,
            preloadImages,
            updateTransform,
            renderMedia
        );
        content.appendChild(prevBtn);
        content.appendChild(nextBtn);
    }

    // --- Close button ---
    const closeZoomBox = () => {
        const box = document.getElementById("zoombox");
        if (!box) return;

        const transitionDuration =
            parseFloat(getComputedStyle(box).transitionDuration || "0.3") * 1000;

        box.style.opacity = "0";
        setTimeout(() => {
            if (state.currentMedia && state.currentMedia._cleanupListeners) {
                state.currentMedia._cleanupListeners();
            }
            box.remove();
            document.removeEventListener("keydown", onKeyDown);
            dispatchZoomBoxEvent("close");
        }, transitionDuration);
    };

    const closeBtn = createCloseButton(closeZoomBox);
    content.appendChild(closeBtn);

    // --- Zoom buttons (only for images) ---
    if (initialType === "image") {
        const zoomButtons = createZoomButtons(media, state, zoombox);
        zoombox.appendChild(zoomButtons);
    }

    // --- Assemble DOM ---
    zoombox.appendChild(content);
    document.getElementById("app").appendChild(zoombox);

    // --- Keyboard handling ---
    const onKeyDown = (e) => {
        if (e.key === "Escape") {
            closeZoomBox();
        } else {
            handleKeyboard(
                e,
                mediaItems,
                state.currentMedia,
                state,
                preloadImages,
                updateTransform,
                closeZoomBox,
                renderMedia
            );
        }
    };
    document.addEventListener("keydown", onKeyDown);

    // --- Show box ---
    requestAnimationFrame(() => {
        zoombox.style.opacity = "1";
        closeBtn.focus();
        dispatchZoomBoxEvent("open", { index: state.currentIndex });
    });
};

export default ZoomBox;
