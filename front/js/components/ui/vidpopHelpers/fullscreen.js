function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  
  function lockOrientation(orientation) {
    screen.orientation?.lock?.(orientation).catch(err => console.warn("Orientation lock failed:", err));
  }
  
  function unlockOrientation() {
    screen.orientation?.unlock?.();
  }
  
  export function toggleFullScreen(container) {
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  
  export function setupFullscreenControls(videoPlayer, controls) {
    let timeout;
  
    function showControls() {
      controls.style.opacity = "1";
      controls.style.pointerEvents = "auto";
    }
  
    function hideControls() {
      controls.style.opacity = "0";
      controls.style.pointerEvents = "none";
    }
  
    videoPlayer.addEventListener("mousemove", () => {
      showControls();
      clearTimeout(timeout);
      timeout = setTimeout(hideControls, 3000);
    });
  
    controls.addEventListener("mouseenter", () => clearTimeout(timeout));
    controls.addEventListener("mouseleave", () => {
      timeout = setTimeout(hideControls, 3000);
    });
  
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement === videoPlayer) {
        videoPlayer.classList.add("fullscreen");
        showControls();
        if (isMobile()) lockOrientation("landscape");
      } else {
        videoPlayer.classList.remove("fullscreen");
        if (isMobile()) unlockOrientation();
      }
    });
  
    setTimeout(hideControls, 3000);
  }
  