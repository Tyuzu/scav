import ContextMenu from "../ContextMenu.mjs";
import { togglePictureInPicture } from "./vutils.js";

const CONTEXT_HANDLER = Symbol("videoContextHandler");

export function setupVideoContextMenu(video, videoId = "") {
  if (video[CONTEXT_HANDLER]) {
    video.removeEventListener("contextmenu", video[CONTEXT_HANDLER]);
  }

  let statsVisible = false;

  const toggleStats = () => {
    statsVisible = !statsVisible;
    console.log(`Video stats ${statsVisible ? "shown" : "hidden"}`);
  };

  const safeClipboardWrite = async text => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
  };

  const escapeAttr = str =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const handler = e => {
    e.preventDefault();

    const currentTime = Math.floor(video.currentTime);
    const src = video.currentSrc;

    const options = [
      {
        label: video.paused ? "Play" : "Pause",
        action: () => (video.paused ? video.play() : video.pause())
      },
      {
        label: video.muted ? "Unmute" : "Mute",
        action: () => { video.muted = !video.muted; }
      },
      {
        label: video.loop ? "Disable Loop" : "Enable Loop",
        action: () => { video.loop = !video.loop; }
      },
      {
        label: "Copy Video URL",
        action: () => safeClipboardWrite(src)
      },
      {
        label: "Copy Timestamped URL",
        action: () => safeClipboardWrite(`${src}#t=${currentTime}`)
      },
      {
        label: "Copy Embed Code",
        action: () => {
          const safeSrc = escapeAttr(src);
          const embed = `<iframe src="${safeSrc}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
          safeClipboardWrite(embed);
        }
      },
      {
        label: "Picture in Picture",
        action: () => {
          if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
            togglePictureInPicture(video);
          }
        }
      },
      {
        label: statsVisible ? "Hide Stats" : "Show Stats",
        action: toggleStats
      }
    ];

    ContextMenu(options, e.pageX, e.pageY);
  };

  video[CONTEXT_HANDLER] = handler;
  video.addEventListener("contextmenu", handler);
}

// import ContextMenu from "../ContextMenu.mjs";
// import { togglePictureInPicture } from "./vutils.js";

// export function setupVideoContextMenu(video, videoId) {
//   let statsVisible = false;

//   const toggleStats = () => {
//     statsVisible = !statsVisible;
//     // Implement your actual stats overlay logic here
//     console.log(`Video stats ${statsVisible ? "shown" : "hidden"}`);
//   };

//   video.addEventListener("contextmenu", (e) => {
//     e.preventDefault();

//     const currentTime = Math.floor(video.currentTime);

//     const options = [
//       {
//         label: video.paused ? "Play" : "Pause",
//         action: () => video.paused ? video.play() : video.pause()
//       },
//       {
//         label: video.muted ? "Unmute" : "Mute",
//         action: () => { video.muted = !video.muted; }
//       },
//       {
//         label: video.loop ? "Disable Loop" : "Enable Loop",
//         action: () => { video.loop = !video.loop; }
//       },
//       {
//         label: "Copy Video URL",
//         action: () => navigator.clipboard.writeText(video.currentSrc)
//       },
//       {
//         label: "Copy Timestamped URL",
//         action: () => navigator.clipboard.writeText(`${video.currentSrc}#t=${currentTime}`)
//       },
//       {
//         label: "Copy Embed Code",
//         action: () => {
//           const embed = `<iframe src="${video.currentSrc}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
//           navigator.clipboard.writeText(embed);
//         }
//       },
//       {
//         label: "Picture in Picture",
//         action: async () => { togglePictureInPicture(video); }
//       },
//       {
//         label: statsVisible ? "Hide Stats" : "Show Stats",
//         action: toggleStats
//       }
//     ];

//     ContextMenu(options, e.pageX, e.pageY);
//   });
// }
