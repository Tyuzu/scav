export function setupFullscreenOrientation(player, video) {
    player.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement === player) {
        if (isMobile() && video.videoWidth > video.videoHeight) {
          lockOrientation("landscape");
        }
      } else if (isMobile()) {
        unlockOrientation();
      }
    });
  }
  
  function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  
  function lockOrientation(orientation) {
    if (screen.orientation?.lock) {
      screen.orientation.lock(orientation).catch(console.warn);
    }
  }
  
  function unlockOrientation() {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  }
  