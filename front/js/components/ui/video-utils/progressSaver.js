export function saveVideoProgress(video, postId) {
    if (!postId) return;
  
    const interval = setInterval(() => {
      if (!video.paused && video.currentTime > 0) {
        localStorage.setItem(`videoProgress-${postId}`, video.currentTime);
      }
    }, 5000);
  
    video.addEventListener("loadedmetadata", () => {
      const saved = localStorage.getItem(`videoProgress-${postId}`);
      if (saved) video.currentTime = parseFloat(saved);
    });
  
    video.addEventListener("ended", () => {
      localStorage.removeItem(`videoProgress-${postId}`);
      clearInterval(interval);
    });
  
    video.addEventListener("pause", () => clearInterval(interval));
  }
  