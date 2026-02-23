
// --- Floating video logic using IntersectionObserver ---
export function initFloatingVideos() {
    const rootMargin = " -50px 0px 0px 0px"; // trigger a bit earlier
    const observerOptions = { root: null, rootMargin, threshold: 0 };

    // create a singleton observer and attach it to current wrappers
    if (!window.__videoFloatObserver) {
        window.__videoFloatObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const wrapper = entry.target;
                // only operate on original wrappers (exclude already-floating clones)
                if (wrapper.dataset.isFloating) return;

                const videoEl = wrapper.querySelector("video");
                if (!videoEl || wrapper.dataset.closed) return;

                if (!entry.isIntersecting) {
                    // went out of view (above threshold)
                    if (!wrapper.dataset.floatingId && !wrapper.dataset.closed) {
                        createFloatingClone(wrapper, videoEl);
                    }
                } else {
                    // back in view
                    if (wrapper.dataset.floatingId) {
                        const floatingEl = document.getElementById(wrapper.dataset.floatingId);
                        if (floatingEl) {
                            removeFloatingClone(wrapper, floatingEl);
                        } else {
                            delete wrapper.dataset.floatingId;
                        }
                    }
                }
            });
        }, observerOptions);
    }

    // Observe all original wrappers present now (ignore clones)
    const videoWrappers = document.querySelectorAll(".video-wrapper:not(.floating):not([data-is-floating])");
    videoWrappers.forEach(w => {
        try { window.__videoFloatObserver.observe(w); } catch (e) { /* ignore */ }
    });
}

function createFloatingClone(wrapper, originalVideo) {
    try {
        // create unique id and set it immediately to avoid re-entrant creation
        const floatId = `floating-${wrapper.dataset.wrapperId || Math.random().toString(36).slice(2,9)}`;
        wrapper.dataset.floatingId = floatId;

        // Create floating container and mark it so it won't be observed/processed as an original
        const floatingWrapper = createElement("div", { id: floatId, class: "video-wrapper floating" }, []);
        floatingWrapper.dataset.isFloating = "1";
        floatingWrapper.classList.add("floating");

        // Clone the video element (deep clone)
        const cloneVideo = originalVideo.cloneNode(true);
        cloneVideo.playsInline = true;
        cloneVideo.controls = true;
        cloneVideo.style.width = "100%";
        cloneVideo.style.height = "auto";

        // Sync time and playing state
        const wasPlaying = !originalVideo.paused && !originalVideo.ended;
        try { cloneVideo.currentTime = originalVideo.currentTime; } catch (e) { /* ignore */ }

        // Pause original to avoid double audio
        try { originalVideo.pause(); } catch (e) { /* ignore */ }

        // Append clone and a close button
        floatingWrapper.appendChild(cloneVideo);

        const closeBtn = createElement("button", { class: "video-close" }, ["×"]);
        // small inline placement only; visuals live in CSS
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "6px";
        closeBtn.style.right = "6px";
        closeBtn.addEventListener("click", () => {
            removeFloatingClone(wrapper, floatingWrapper);
        });
        floatingWrapper.appendChild(closeBtn);

        // Add to DOM
        document.body.appendChild(floatingWrapper);

        // store references for cleanup & sync
        floatingWrapper._originalVideo = originalVideo;
        floatingWrapper._cloneVideo = cloneVideo;
        floatingWrapper._wasPlaying = wasPlaying;

        // play clone
        cloneVideo.muted = false;
        cloneVideo.play().catch(() => { /* ignore play rejection */ });

        // make draggable (CSS handles fixed positioning & dragging visuals)
        makeDraggableFloating(floatingWrapper);

        // sync loop (keeps clone in sync if original unexpectedly changes)
        const syncInterval = setInterval(() => {
            if (floatingWrapper._originalVideo && !floatingWrapper._originalVideo.paused) {
                try {
                    floatingWrapper._cloneVideo.currentTime = floatingWrapper._originalVideo.currentTime;
                } catch (e) { /* ignore */ }
            }
        }, 250);
        floatingWrapper._syncInterval = syncInterval;

    } catch (err) {
        console.error("createFloatingClone error", err);
        if (wrapper && wrapper.dataset.floatingId) delete wrapper.dataset.floatingId;
    }
}

function removeFloatingClone(wrapper, floatingEl) {
    try {
        // clear sync
        if (floatingEl._syncInterval) {
            clearInterval(floatingEl._syncInterval);
        }

        const cloneVideo = floatingEl._cloneVideo;
        const originalVideo = floatingEl._originalVideo;

        if (cloneVideo && originalVideo) {
            try { originalVideo.currentTime = cloneVideo.currentTime; } catch (e) { /* ignore */ }

            if (floatingEl._wasPlaying) {
                originalVideo.play().catch(() => {});
            }
        }

        if (floatingEl.parentElement) {
            floatingEl.parentElement.removeChild(floatingEl);
        }

        if (wrapper && wrapper.dataset.floatingId) {
            delete wrapper.dataset.floatingId;
        }

    } catch (err) {
        console.error("removeFloatingClone error", err);
        if (wrapper && wrapper.dataset.floatingId) {
            delete wrapper.dataset.floatingId;
        }
    }
}

function wrapperMarkClosed(wrapper, videoEl) {
    wrapper.dataset.closed = "1";
    try { videoEl.pause(); } catch (_) {}
    const floatId = wrapper.dataset.floatingId;
    if (floatId) {
        const floatingEl = document.getElementById(floatId);
        if (floatingEl) removeFloatingClone(wrapper, floatingEl);
    }
}

// --- Make floating element draggable (position: fixed via CSS) ---
function makeDraggableFloating(el) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    el.style.touchAction = "none";

    const onDown = (e) => {
        isDragging = true;
        el.classList.add("dragging");
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = el.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        el.style.cursor = "grabbing";
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        el.style.left = `${clientX - offsetX}px`;
        el.style.top = `${clientY - offsetY}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
    };

    const onUp = () => {
        isDragging = false;
        el.classList.remove("dragging");
        el.style.cursor = "grab";
    };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("touchstart", onDown, { passive: true });

    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: true });

    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
}
