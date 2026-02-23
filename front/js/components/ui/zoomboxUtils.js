import { dispatchZoomBoxEvent } from "../../utils/eventDispatcher.js";
import Imagex from "../base/Imagex.js";

export const createOverlay = () => {
    const el = document.createElement("div");
    el.className = "zoombox-overlay";
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s ease";
    return el;
};

export const createImageElement = (src) => {
    const img = Imagex({ src: src, });
    img.alt = "ZoomBox Image";
    img.style.transition = "transform 0.2s ease-out";
    img.style.willChange = "transform";
    return img;
};

export const applyDarkMode = (el) => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        el.classList.add("dark-mode");
    }
};

export const preloadImages = (images, index) => {
    const preloadIndexes = [index, (index + 1) % images.length, (index - 1 + images.length) % images.length];
    preloadIndexes.forEach((i) => {
        const img = new Image();
        img.src = images[i];
    });
};

export const updateTransform = (img, state) => {
    const transformStr = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoomLevel}) rotate(${state.angle}deg) ${state.flip ? "scaleX(-1)" : ""}`;
    img.style.transform = transformStr;
};

export const smoothZoom = (event, img, state) => {
    event.preventDefault();
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const prevZoom = state.zoomLevel;

    state.zoomLevel *= event.deltaY > 0 ? 0.9 : 1.1;
    state.zoomLevel = Math.max(1, Math.min(state.zoomLevel, Math.max(naturalW / img.width, naturalH / img.height, 12)));

    const rect = img.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = state.zoomLevel / prevZoom;

    // Adjust pan based on cursor position
    state.panX -= (cursorX - state.panX) * (zoomFactor - 1);
    state.panY -= (cursorY - state.panY) * (zoomFactor - 1);

    // Clamp the image inside the viewport
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const imgWidth = img.offsetWidth * state.zoomLevel;
    const imgHeight = img.offsetHeight * state.zoomLevel;

    const maxPanX = (imgWidth - viewWidth) / 2;
    const maxPanY = (imgHeight - viewHeight) / 2;

    state.panX = Math.min(maxPanX, Math.max(-maxPanX, state.panX));
    state.panY = Math.min(maxPanY, Math.max(-maxPanY, state.panY));

    img.style.transformOrigin = `${(cursorX / rect.width) * 100}% ${(cursorY / rect.height) * 100}%`;
    updateTransform(img, state);
    dispatchZoomBoxEvent("zoom", { level: state.zoomLevel });

};


export const handleMouseDown = (e, state) => {
    if (state.zoomLevel <= 1) return;
    state.isDragging = true;
    state.startX = e.clientX - state.panX;
    state.startY = e.clientY - state.panY;
    state.velocityX = 0;
    state.velocityY = 0;
};

export const handleMouseMove = (e, state, img) => {
    if (!state.isDragging) return;
    e.preventDefault();
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    state.velocityX = dx - state.panX;
    state.velocityY = dy - state.panY;
    state.panX = dx;
    state.panY = dy;
    updateTransform(img, state);
};

export const handleMouseUp = (state, img) => {
    state.isDragging = false;
    const animate = () => {
        state.panX += state.velocityX * 0.95;
        state.panY += state.velocityY * 0.95;
        state.velocityX *= 0.9;
        state.velocityY *= 0.9;
        updateTransform(img, state);
        if (Math.abs(state.velocityX) > 0.1 || Math.abs(state.velocityY) > 0.1) {
            requestAnimationFrame(animate);
        }
    };
    animate();
};

export const handleTouchStart = (e, state, img) => {
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
            state.panX = 0;
            state.panY = 0;
            updateTransform(img, state);
            e.preventDefault();
        }
        state.lastTap = now;
        state.isDragging = true;
        state.startX = e.touches[0].clientX - state.panX;
        state.startY = e.touches[0].clientY - state.panY;
    }
};

export const handleTouchMove = (e, state, img) => {
    if (e.touches.length === 2 && state.initialPinchDistance) {
        const newDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const prevZoom = state.zoomLevel;
        const scaleFactor = newDistance / state.initialPinchDistance;
        state.zoomLevel = Math.max(1, Math.min(3, state.initialZoom * scaleFactor));

        const rect = img.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const zoomFactor = state.zoomLevel / prevZoom;

        state.panX -= (midX - state.panX) * (zoomFactor - 1);
        state.panY -= (midY - state.panY) * (zoomFactor - 1);

        updateTransform(img, state);
    }
};

export const handleTouchEnd = (e, state, img) => {
    if (e.touches.length < 2) state.initialPinchDistance = null;
    if (!e.touches.length) handleMouseUp(state, img);
};

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
        dispatchZoomBoxEvent("imagechange", { index: state.currentIndex, src: images[state.currentIndex] });
    };

    return [prev, next];
};

export const createCloseButton = (closeFn) => {
    const btn = document.createElement("button");
    btn.className = "zoombox-close-btn";
    btn.textContent = "✖";
    btn.onclick = closeFn;
    return btn;
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
            break;
        case "ArrowLeft":
            state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
            img.src = images[state.currentIndex];
            preload(images, state.currentIndex);
            state.zoomLevel = 1;
            state.panX = 0;
            state.panY = 0;
            update(img, state);
            break;
        case "+":
            state.zoomLevel = Math.min(3, state.zoomLevel * 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            break;
        case "-":
            state.zoomLevel = Math.max(1, state.zoomLevel / 1.1);
            state.panX *= state.zoomLevel / prevZoom;
            state.panY *= state.zoomLevel / prevZoom;
            update(img, state);
            break;
        case "r":
            state.angle = (state.angle + 90) % 360;
            update(img, state);
            break;
        case "h":
            state.flip = !state.flip;
            update(img, state);
            break;
        case "Escape":
            close();
            break;
    }
};
