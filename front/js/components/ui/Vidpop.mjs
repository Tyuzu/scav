// import Modal from "./Modal.mjs";
// import { generateVideoPlayer } from "./vidpopHelpers";
// import { createIconButton } from "../../utils/svgIconButton";
// import { xSVG } from "../svgs";
// import { createElement } from "../../components/createElement";

// const Vidpop = async (mediaSrc, videoid, options = {}) => {
//   const {
//     poster = null,
//     theme = "light",
//     qualities = [],
//     subtitles = []
//   } = options;

//   const videoPlayer = await generateVideoPlayer(
//     mediaSrc,
//     poster,
//     qualities,
//     subtitles,
//     videoid
//   );

//   const closeBtn = createIconButton({ svgMarkup: xSVG });
//   closeBtn.setAttribute("aria-label", "Close Theater Mode");

//   const wrapper = createElement(
//     "div",
//     { class: `vidpop theme-${theme}` },
//     [videoPlayer, closeBtn]
//   );

//   const { close } = Modal({
//     variant: "theater",
//     size: "fullscreen",
//     showHeader: false,
//     showCloseButton: false,
//     flushBody: true,
//     autofocus: false,
//     closeOnOverlayClick: true,
//     content: () => wrapper,
//     onBeforeClose: () => {
//       const video = wrapper.querySelector("video");
//       video?.pause?.();
//     }
//   });

//   closeBtn.addEventListener("click", () => close());
// };

// export default Vidpop;


// import "../../../css/ui/Vidpop.css";
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";
import { generateVideoPlayer } from "./vidpopHelpers";

const Vidpop = (mediaSrc, videoid, options = {}) => {
  const { poster = null, theme = "light", qualities = [], subtitles = [] } = options;

  const sightbox = document.createElement("div");
  sightbox.className = `sightbox theme-${theme}`;

  const overlay = document.createElement("div");
  overlay.className = "sightbox-overlay";
  overlay.addEventListener("click", () => removePopup(sightbox));

  const content = document.createElement("div");
  content.className = "sightbox-content";

  const closeButton = document.createElement("button");
  closeButton.className = "sightbox-close";
  // closeButton.textContent = "×";
  closeButton.appendChild(createIconButton({svgMarkup:xSVG}));
  closeButton.setAttribute("aria-label", "Close Theater Mode");
  closeButton.addEventListener("click", () => removePopup(sightbox));

  sightbox.appendChild(overlay);
  sightbox.appendChild(content);
  // Directly append the generated video player
  generateVideoPlayer(mediaSrc, poster, qualities, subtitles, videoid).then(videoPlayer => {
    content.appendChild(videoPlayer);
    content.appendChild(closeButton);
  });

  document.getElementById('app').appendChild(sightbox);
  return sightbox;
};


function removePopup(popupElement) {
  if (!popupElement || !popupElement.parentNode) {
return;
}

  popupElement.classList.add("fade-out"); // CSS should handle opacity transition

  setTimeout(() => {
    if (popupElement.parentNode) {
      popupElement.parentNode.removeChild(popupElement);
    }
  }, 300); // match the CSS transition duration
}


export default Vidpop;
