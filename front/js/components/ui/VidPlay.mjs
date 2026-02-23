import "../../../css/ui/VidPlay.css";
import { generateVideoPlayer } from "./vidpopHelpers";

const VidPlay = (videoSrc, poster, qualities, subtitles, videoid) => {
  const player = document.createElement("div");
  player.className = "video-player-container";

  const stateKey = `vidplay-${videoid}-${Date.now()}`;

  // Push a new state into history when the video player opens
  history.pushState({ [stateKey]: true }, "");

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.className = "video-close-btn";
  closeButton.textContent = "X";
  closeButton.addEventListener("click", () => closeVidPlay(false));
  player.appendChild(closeButton);

  // Append the generated video player
  generateVideoPlayer(videoSrc, poster, qualities, subtitles, videoid).then((videoPlayer) => {
    player.appendChild(videoPlayer);
  });

  // Remove the player and optionally trigger history.back
  function closeVidPlay(triggerBack = true) {
    if (document.getElementById("app").contains(player)) {
      player.remove();
      window.removeEventListener("popstate", onPopState);
      if (triggerBack) history.back();
    }
  }

  // Listen to back button to remove player
  function onPopState(event) {
    if (event.state && event.state[stateKey]) {
      closeVidPlay(false);
    }
  }

  window.addEventListener("popstate", onPopState);

  return player;
};

export default VidPlay;
