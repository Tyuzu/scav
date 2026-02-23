import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";
import Imagex from "../base/Imagex.js";

/* =========================
   Basic UI Creation Functions
   ========================= */

export const createOverlay = () => {
    const el = document.createElement("div");
    el.className = "zoombox-overlay";
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    return el;
};

export const createImageElement = (src) => {
    const img = Imagex({ src });
    img.alt = "ZoomBox Image";
    img.style.transition = "transform 0.2s ease-out";
    img.style.willChange = "transform";
    img.style.transformOrigin = "50% 50%";
    return img;
};

export function createVideoElement(src) {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.style.maxWidth = "90%";
    video.style.maxHeight = "90%";
    video.style.borderRadius = "6px";
    return video;
}

export const applyDarkMode = (el) => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        el.classList.add("dark-mode");
    }
};

export const preloadImages = (images, index) => {
    const preloadIndexes = [
        index,
        (index + 1) % images.length,
        (index - 1 + images.length) % images.length,
    ];
    preloadIndexes.forEach((i) => {
        const img = new Image();
        img.src = images[i];
    });
};

/* =========================
   Transformation & Zoom Logic
   ========================= */

export const updateTransform = (img, state) => {
    img.style.transformOrigin = "50% 50%";
    const transformStr = [
        `translate(${state.panX}px, ${state.panY}px)`,
        `scale(${state.zoomLevel})`,
        `rotate(${state.angle}deg)`,
        state.flip ? "scaleX(-1)" : "",
    ].join(" ");
    img.style.transform = transformStr;
    updateCursor(img, state);
};

export const updateCursor = (img, state) => {
    if (state.zoomLevel > 1) {
        img.style.cursor = state.isDragging ? "grabbing" : "grab";
    } else {
        img.style.cursor = "auto";
    }
};

let zoomIndicatorTimeout;
export const showZoomIndicator = (container, zoomLevel) => {
    let indicator = container.querySelector(".zoombox-zoom-indicator");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "zoombox-zoom-indicator";
        // indicator.style.position = "absolute";
        // indicator.style.bottom = "10px";
        // indicator.style.right = "10px";
        // indicator.style.padding = "5px 10px";
        // indicator.style.background = "rgba(0,0,0,0.6)";
        // indicator.style.color = "#fff";
        // indicator.style.borderRadius = "3px";
        // indicator.style.fontSize = "14px";
        container.appendChild(indicator);
    }
    indicator.textContent = `${Math.round(zoomLevel * 100)}%`;
    indicator.style.opacity = "1";
    clearTimeout(zoomIndicatorTimeout);
    zoomIndicatorTimeout = setTimeout(() => {
        indicator.style.opacity = "0";
    }, 1000);
};

export const showZoomLimitFeedback = (container, limitType) => {
    const feedback = document.createElement("div");
    feedback.className = "zoombox-zoom-limit-feedback";
    feedback.style.position = "absolute";
    feedback.style.top = "50%";
    feedback.style.left = "50%";
    feedback.style.transform = "translate(-50%, -50%)";
    feedback.style.padding = "10px 20px";
    feedback.style.background = "rgba(255,0,0,0.7)";
    feedback.style.color = "#fff";
    feedback.style.borderRadius = "5px";
    feedback.style.fontSize = "16px";
    feedback.textContent =
        limitType === "min" ? "Minimum Zoom Reached" : "Maximum Zoom Reached";
    container.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1000);
};

export const smoothZoom = (event, img, state, container) => {
    event.preventDefault();

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const prevZoom = state.zoomLevel;

    state.zoomLevel *= event.deltaY > 0 ? 0.9 : 1.1;
    const maxZoom = Math.max(naturalW / img.width, naturalH / img.height, 16);
    const clampedZoom = Math.max(1, Math.min(state.zoomLevel, maxZoom));

    if (clampedZoom !== state.zoomLevel) {
        showZoomLimitFeedback(
            container,
            clampedZoom === 1 ? "min" : "max"
        );
    }
    state.zoomLevel = clampedZoom;

    const rect = img.getBoundingClientRect();
    const cursorX = event.clientX;
    const cursorY = event.clientY;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = cursorX - centerX;
    const offsetY = cursorY - centerY;
    const zoomFactor = state.zoomLevel / prevZoom;

    state.panX -= offsetX * (zoomFactor - 1);
    state.panY -= offsetY * (zoomFactor - 1);

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const imgWidth = img.offsetWidth * state.zoomLevel;
    const imgHeight = img.offsetHeight * state.zoomLevel;
    const maxPanX = Math.max(0, (imgWidth - viewWidth) / 2);
    const maxPanY = Math.max(0, (imgHeight - viewHeight) / 2);

    if (imgWidth <= viewWidth) state.panX = 0;
    else state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));

    if (imgHeight <= viewHeight) state.panY = 0;
    else state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

    img.style.transformOrigin = "50% 50%";
    updateTransform(img, state);
    showZoomIndicator(container, state.zoomLevel);
    dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
};

/* =========================
   Mouse & Touch Handling
   ========================= */

export const handleMouseDown = (e, state, img) => {
    if (state.zoomLevel <= 1) return;
    e.preventDefault();

    state.isDragging = true;
    state.startX = e.clientX - state.panX;
    state.startY = e.clientY - state.panY;
    state.velocityX = 0;
    state.velocityY = 0;
    img.style.cursor = "grabbing";

    const onMove = (moveEvent) => {
        if (!state.isDragging) return;
        moveEvent.preventDefault();
        const dx = moveEvent.clientX - state.startX;
        const dy = moveEvent.clientY - state.startY;
        state.velocityX = dx - state.panX;
        state.velocityY = dy - state.panY;
        state.panX = dx;
        state.panY = dy;
        updateTransform(img, state);
    };

    const onUp = () => {
        state.isDragging = false;
        img.style.cursor = state.zoomLevel > 1 ? "grab" : "auto";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);

        const animate = () => {
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            const imgWidth = img.offsetWidth * state.zoomLevel;
            const imgHeight = img.offsetHeight * state.zoomLevel;
            const maxPanX = (imgWidth - viewWidth) / 2;
            const maxPanY = (imgHeight - viewHeight) / 2;

            state.panX += state.velocityX * 0.95;
            state.panY += state.velocityY * 0.95;

            if (Math.abs(state.panX) > maxPanX) state.velocityX *= 0.8;
            if (Math.abs(state.panY) > maxPanY) state.velocityY *= 0.8;

            state.velocityX *= 0.9;
            state.velocityY *= 0.9;
            updateTransform(img, state);

            if (
                Math.abs(state.velocityX) > 0.1 ||
                Math.abs(state.velocityY) > 0.1
            ) {
                requestAnimationFrame(animate);
            } else {
                dispatchZoomBoxEvent("pan-end", {
                    panX: state.panX,
                    panY: state.panY,
                });
            }
        };
        animate();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
};

/* ======= Touch support (pinch + drag + double tap) ======= */

export const handleTouchStart = (e, state, img, container) => {
    if (e.touches.length === 2) {
        state.initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        state.initialZoom = state.zoomLevel;
    } else if (e.touches.length === 1) {
        const now = Date.now();
        const tapLength = now - state.lastTap;
        if (tapLength < 300 && tapLength > 0) {
            state.zoomLevel = state.zoomLevel === 1 ? 2 : 1;
            if (state.zoomLevel === 1) autoCenterImage(img, state);
            else {
                state.panX = 0;
                state.panY = 0;
                updateTransform(img, state);
            }
            dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
            e.preventDefault();
        }
        state.lastTap = now;
        state.isDragging = true;
        state.startX = e.touches[0].clientX - state.panX;
        state.startY = e.touches[0].clientY - state.panY;
    }
};

export const handleTouchMove = (e, state, img, container) => {
    if (e.touches.length === 2 && state.initialPinchDistance) {
        const newDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const prevZoom = state.zoomLevel;
        const scaleFactor = newDistance / state.initialPinchDistance;
        state.zoomLevel = Math.max(1, Math.min(3, state.initialZoom * scaleFactor));

        const rect = img.getBoundingClientRect();
        const midX =
            (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY =
            (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const zoomFactor = state.zoomLevel / prevZoom;

        state.panX -= (midX - state.panX) * (zoomFactor - 1);
        state.panY -= (midY - state.panY) * (zoomFactor - 1);

        updateTransform(img, state);
        showZoomIndicator(container, state.zoomLevel);
        dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
    }
};

export const handleTouchEnd = (e, state, img) => {
    if (e.touches.length < 2) state.initialPinchDistance = null;
    if (!e.touches.length) state.isDragging = false;
};

/* =========================
   Navigation & Control Buttons
   ========================= */

export const createNavigationButtons = (images, img, state, preload, update) => {
    const prev = document.createElement("button");
    prev.className = "zoombox-prev-btn";
    prev.textContent = "⮘";
    prev.onclick = () => {
        state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
        img.src = images[state.currentIndex];
        preload(images, state.currentIndex);
        state.zoomLevel = 1;
        state.panX = 0;
        state.panY = 0;
        update(img, state);
        dispatchZoomBoxEvent("mediachange", { index: state.currentIndex, src: images[state.currentIndex] });
    };

    const next = document.createElement("button");
    next.className = "zoombox-next-btn";
    next.textContent = "⮚";
    next.onclick = () => {
        state.currentIndex = (state.currentIndex + 1) % images.length;
        img.src = images[state.currentIndex];
        preload(images, state.currentIndex);
        state.zoomLevel = 1;
        state.panX = 0;
        state.panY = 0;
        update(img, state);
        dispatchZoomBoxEvent("mediachange", { index: state.currentIndex, src: images[state.currentIndex] });
    };

    return [prev, next];
};

export const createCloseButton = (closeFn) => {
    const btn = document.createElement("button");
    btn.className = "zoombox-close-btn";
    btn.textContent = "✖";
    btn.onclick = () => {
        closeFn();
        dispatchZoomBoxEvent("close");
    };
    return btn;
};

export const createZoomButtons = (img, state, container) => {
    const zoomContainer = document.createElement("div");
    zoomContainer.className = "zoombox-zoom-buttons";
    zoomContainer.style.position = "absolute";
    zoomContainer.style.bottom = "8vh";
    zoomContainer.style.right = "20px";
    zoomContainer.style.display = "flex";
    zoomContainer.style.flexDirection = "column";
    zoomContainer.style.gap = "5px";
    zoomContainer.style.zIndex = 10;

    const zoomInBtn = document.createElement("button");
    zoomInBtn.textContent = "+";
    zoomInBtn.onclick = () => {
        const fakeEvent = {
            deltaY: -1,
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            preventDefault: () => {},
        };
        smoothZoom(fakeEvent, img, state, container);
    };

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.textContent = "–";
    zoomOutBtn.onclick = () => {
        const fakeEvent = {
            deltaY: 1,
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2,
            preventDefault: () => {},
        };
        smoothZoom(fakeEvent, img, state, container);
    };

    zoomContainer.appendChild(zoomInBtn);
    zoomContainer.appendChild(zoomOutBtn);
    return zoomContainer;
};

/* =========================
   Utility Functions
   ========================= */

export const autoCenterImage = (img, state) => {
    const animateCenter = () => {
        state.panX *= 0.85;
        state.panY *= 0.85;
        updateTransform(img, state);
        if (Math.abs(state.panX) > 0.5 || Math.abs(state.panY) > 0.5) {
            requestAnimationFrame(animateCenter);
        } else {
            state.panX = 0;
            state.panY = 0;
            updateTransform(img, state);
        }
    };
    animateCenter();
};

export const handleKeyboard = (e, images, img, state, preload, update, close) => {
    const prevZoom = state.zoomLevel;
    switch (e.key) {
        case "ArrowRight":
            state.currentIndex = (state.currentIndex + 1) % images.length;
            img.src = images[state.currentIndex];
            preload(images, state.currentIndex);
            state.zoomLevel = 1;
            state.panX = 0;
            state.panY = 0;
            update(img, state);
            dispatchZoomBoxEvent("mediachange", { index: state.currentIndex, src: images[state.currentIndex] });
            break;
        case "ArrowLeft":
            state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
            img.src = images[state.currentIndex];
            preload(images, state.currentIndex);
            state.zoomLevel = 1;
            state.panX = 0;
            state.panY = 0;
            update(img, state);
            dispatchZoomBoxEvent("mediachange", { index: state.currentIndex, src: images[state.currentIndex] });
            break;
        case "+":
            state.zoomLevel = Math.min(3, state.zoomLevel * 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
            break;
        case "-":
            state.zoomLevel = Math.max(1, state.zoomLevel / 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });
            break;
        case "r":
            state.angle = (state.angle + 90) % 360;
            update(img, state);
            dispatchZoomBoxEvent("rotate", { angle: state.angle });
            break;
        case "h":
            state.flip = !state.flip;
            update(img, state);
            dispatchZoomBoxEvent("flip", { flip: state.flip });
            break;
        case "Escape":
            close();
            break;
    }
};
