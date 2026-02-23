export const setVolume = (video, val) => {
    video.volume = Math.max(0, Math.min(1, video.volume + val));
  };
  
  export const toggleMute = (video) => {
    video.muted = !video.muted;
  };
  
  export const resetSpeed = (video) => video.playbackRate = 1;
  export const slower = (video) => video.playbackRate = Math.max(0.25, video.playbackRate - 0.15);
  export const faster = (video) => video.playbackRate = Math.min(3, video.playbackRate + 0.15);
  