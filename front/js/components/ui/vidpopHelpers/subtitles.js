import { parseVTT } from "./vutils.js";

async function setupSubtitles(video, subtitles, subtitleContainer) {
  const subtitleTracks = await Promise.all(
    subtitles.map(async (subtitle) => ({
      label: subtitle.label,
      srclang: subtitle.srclang,
      src: subtitle.src,
      data: await fetch(subtitle.src).then(res => res.text()).then(parseVTT),
    }))
  );

  let currentSubtitleTrackIndex = -1;

  video.addEventListener("timeupdate", () => {
    if (currentSubtitleTrackIndex === -1) {
      subtitleContainer.textContent = "";
      subtitleContainer.style.display = "none";
      return;
    }

    const currentTime = video.currentTime;
    const track = subtitleTracks[currentSubtitleTrackIndex];
    const activeSubtitle = track.data.find(s => currentTime >= s.start && currentTime <= s.end);

    subtitleContainer.textContent = activeSubtitle ? activeSubtitle.text : "";
    subtitleContainer.style.display = activeSubtitle ? "block" : "none";
  });

  return subtitleTracks;
}

export { setupSubtitles };
