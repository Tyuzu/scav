import {debounce} from "../../utils/deutils";

function setupVideoUtilityFunctions(video, videoid) {
    const container = video.parentElement || document.body;

    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        container.classList.add("dark-mode");
    }

    let zoomLevel = 1;
    let panX = 0, panY = 0;
    let angle = 0, flip = false;
    const minZoom = 1, maxZoom = 8;
    let isDragging = false, startX = 0, startY = 0;

    const updateTransform = debounce(() => {
        video.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel}) rotate(${angle}deg) ${flip ? "scaleX(-1)" : ""}`;
    }, 30);

    const changeZoom = (delta, event) => {
        const rect = video.getBoundingClientRect();
        const cursorX = event ? event.clientX - rect.left : rect.width / 2;
        const cursorY = event ? event.clientY - rect.top : rect.height / 2;

        const prevZoom = zoomLevel;
        zoomLevel *= delta > 0 ? 0.95 : 1.05; // Smoother zoom steps
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));

        const zoomFactor = zoomLevel / prevZoom;

        // Adjust pan to ensure cursor stays fixed relative to zoom
        panX -= (cursorX - rect.width / 2) * (zoomFactor - 1);
        panY -= (cursorY - rect.height / 2) * (zoomFactor - 1);

        constrainPan();
        updateTransform();
    };

    const constrainPan = () => {
        const rect = video.getBoundingClientRect();
        const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
        const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

        panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
        panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
    };


    const onWheel = (event) => {
        event.preventDefault();
        changeZoom(event.deltaY, event);
    };

    const flipVideo = () => {
        flip = !flip;
        updateTransform();
    };

    const onMouseDown = (event) => {
        if (zoomLevel <= 1) return;
        event.preventDefault();
        isDragging = true;
        startX = event.clientX - panX;
        startY = event.clientY - panY;
    };

    const onMouseMove = (event) => {
        if (!isDragging) return;
        event.preventDefault();
        panX = event.clientX - startX;
        panY = event.clientY - startY;
        constrainPan();
        updateTransform();
    };

    const onMouseUp = () => {
        isDragging = false;
    };

    const onTouchStart = (event) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            const initialPinchDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );

            const onTouchMove = debounce((moveEvent) => {
                const newDistance = Math.hypot(
                    moveEvent.touches[0].clientX - moveEvent.touches[1].clientX,
                    moveEvent.touches[0].clientY - moveEvent.touches[1].clientY
                );
                const scaleFactor = newDistance / initialPinchDistance;

                zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * scaleFactor));
                constrainPan();
                updateTransform();
            }, 30);

            const onTouchEnd = () => {
                video.removeEventListener("touchmove", onTouchMove);
                video.removeEventListener("touchend", onTouchEnd);
            };

            video.addEventListener("touchmove", onTouchMove, { passive: false });
            video.addEventListener("touchend", onTouchEnd);
        } else if (event.touches.length === 1) {
            isDragging = true;
            startX = event.touches[0].clientX - panX;
            startY = event.touches[0].clientY - panY;
        }
    };

    const onTouchMove = (event) => {
        if (!isDragging || event.touches.length !== 1) return;
        panX = event.touches[0].clientX - startX;
        panY = event.touches[0].clientY - startY;
        constrainPan();
        updateTransform();
    };

    const onTouchEnd = () => {
        isDragging = false;
    };
    const hotkeysEnabled = true;

    const isInputField = (element) => ["INPUT", "TEXTAREA"].includes(element.tagName) || element.isContentEditable;

    window.addEventListener("keydown", (e) => {
        if (!hotkeysEnabled || isInputField(e.target)) return;

        e.preventDefault();

        const actions = {
            "h": flipVideo,
            "+": () => changeZoom(-1),
            "-": () => changeZoom(1),
            "c": () => faster(video),
            "x": () => resetSpeed(video),
            "z": () => slower(video),
            "b": () => setVolume(video, -0.1),
            "n": () => setVolume(video, 0.1),
            "m": () => toggleMute(video),
            "v": () => video.paused ? video.play() : video.pause(),
            ",": () => video.currentTime = Math.max(0, video.currentTime - 1 / 12),
            ".": () => video.currentTime = Math.min(video.duration, video.currentTime + 1 / 12),
            "r": () => {
                angle = (angle + 90) % 360;
                video.style.width = "100vh";
            },

            // Modifier key combos
            "Shift+ArrowUp": () => setVolume(video, 0.1),
            "Shift+ArrowDown": () => setVolume(video, -0.1),
            "Ctrl+ArrowLeft": () => video.currentTime = Math.max(0, video.currentTime - 5),
            "Ctrl+ArrowRight": () => video.currentTime = Math.min(video.duration, video.currentTime + 5),
            "Alt+r": () => { angle = 0; video.style.width = ""; }, // Reset rotation
        };

        const keyCombo = [
            e.ctrlKey ? "Ctrl" : "",
            e.shiftKey ? "Shift" : "",
            e.altKey ? "Alt" : "",
            e.metaKey ? "Meta" : "",
            e.key,
        ].filter(Boolean).join("+");

        if (actions[keyCombo]) {
            actions[keyCombo]();
            if (!["m", "v"].includes(e.key)) updateTransform(); // Only update transform if needed
        }
    });

    if (videoid) {
        saveVideoProgress(video, videoid);
    }

    video.addEventListener("wheel", onWheel, { passive: false });
    video.addEventListener("mousedown", onMouseDown);
    video.addEventListener("mousemove", onMouseMove);
    video.addEventListener("mouseup", onMouseUp);
    video.addEventListener("mouseleave", onMouseUp);
    video.addEventListener("touchstart", onTouchStart, { passive: false });
    video.addEventListener("touchmove", onTouchMove, { passive: false });
    video.addEventListener("touchend", onTouchEnd);
}

// // Debounce function to limit how often a function runs
// function debounce(func, wait) {
//     let timeout;
//     return function (...args) {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => func.apply(this, args), wait);
//     };
// }


function setVolume(video, value) {
    video.volume = Math.min(1, Math.max(0, video.volume + value));
}


function toggleMute(video, button = null) {
    video.muted = !video.muted;
    if (button) {
        button.textContent = video.muted ? "🔇" : "🔊";
    }
}

function resetSpeed(video) {
    video.playbackRate = 1;
}

function slower(video) {
    video.playbackRate = Math.max(0.25, video.playbackRate - 0.15);
}

function faster(video) {
    video.playbackRate = Math.min(3.0, video.playbackRate + 0.15);
}

/**
 * 
 * @param {*} video 
 * @param {*} postId 
 * @returns 
 */

function saveVideoProgress(video, postIdArray) {
    // const postIds = Array.isArray(postIdArray) ? postIdArray : [];
    console.log("frhj", postIdArray);
    let postId = postIdArray;

    if (!postId) return;

    // Save progress every 5 seconds
    const saveInterval = setInterval(() => {
        if (!video.paused && video.currentTime > 0) {
            localStorage.setItem(`videoProgress-${postId}`, video.currentTime);
        }
    }, 5000);

    // Restore progress when video loads
    video.addEventListener("loadedmetadata", () => {
        const savedTime = localStorage.getItem(`videoProgress-${postId}`);
        if (savedTime) {
            video.currentTime = parseFloat(savedTime);
        }
    });

    // Remove progress when video ends
    video.addEventListener("ended", () => {
        localStorage.removeItem(`videoProgress-${postId}`);
        clearInterval(saveInterval);
    });

    // Stop saving if video is removed
    video.addEventListener("pause", () => clearInterval(saveInterval));
}


/********** */

export { setupVideoUtilityFunctions };