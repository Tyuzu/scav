export function setupQualitySwitch(video, qualities, selector) {
    if (!selector) return;
  
    selector.addEventListener("change", (event) => {
      const selectedLabel = event.target.value;
      const selectedQuality = qualities.find(q => q.label === selectedLabel);
      if (!selectedQuality || selectedQuality.src === video.src) return;
  
      const currentTime = video.currentTime;
      const isPaused = video.paused;
  
      localStorage.setItem("videoQuality", selectedQuality.label);
      video.src = selectedQuality.src;
      video.setAttribute("data-quality", selectedQuality.label);
  
      video.addEventListener("loadedmetadata", () => {
        video.currentTime = currentTime;
        if (!isPaused) video.play();
      }, { once: true });
    });
  }
  