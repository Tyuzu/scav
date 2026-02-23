export function createVideoElement({ mediaSrc, poster, qualities }) {
    const video = document.createElement("video");
    video.id = "main-video";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.poster = poster;
    video.preload = "metadata";
    // video.crossOrigin = "anonymous";
  
    if (qualities.length) {
      const storedQuality = localStorage.getItem("videoQuality") || "144p";
      const defaultQuality = qualities.find(q => q.label === storedQuality) || qualities[0];
      video.src = defaultQuality.src;
      video.setAttribute("data-quality", defaultQuality.label);
  
      qualities.forEach(quality => {
        const source = document.createElement("source");
        source.src = quality.src;
        source.type = "video/mp4";
        source.setAttribute("data-quality", quality.label);
        video.appendChild(source);
      });
    } else {
      video.src = mediaSrc;
    }
  
    video.appendChild(document.createTextNode("Your browser does not support the video tag."));
    return video;
  }
  