export function setupProgress(video, progressBar, progressIndicator) {
    let isDragging = false;
  
    const update = () => {
      if (!isDragging && !isNaN(video.duration)) {
        progressIndicator.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
    };
  
    const seek = (event) => {
      const rect = progressBar.getBoundingClientRect();
      const fraction = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      video.currentTime = video.duration * fraction;
      progressIndicator.style.width = `${fraction * 100}%`;
    };
  
    progressBar.addEventListener("mousedown", (e) => {
      isDragging = true;
      seek(e);
    });
  
    document.addEventListener("mousemove", (e) => {
      if (isDragging) seek(e);
    });
  
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  
    video.addEventListener("timeupdate", update);
  }
  