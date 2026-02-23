import { createElement } from "../../components/createElement.js";
import Imagex from "../base/Imagex.js";
import ZoomBox from "./ZoomBox.mjs";

function getMediaType(src) {
  const lower = src.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return "image";
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) return "video";
  if (/\.(pdf)$/.test(lower)) return "pdf";
  return "image"; // fallback
}

export function ImageGallery(mediaItems = []) {
  return createElement("div", {
    class: "image-gallery",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
    }
  }, mediaItems.map((src, index) => {
    const type = getMediaType(src);

    // thumbnail logic
    let thumb;
    if (type === "video") {
      thumb = createElement("video", {
        src,
        style: {
          width: "120px",
          height: "80px",
          objectFit: "cover",
          borderRadius: "4px",
          border: "1px solid #ccc",
          cursor: "pointer"
        },
        muted: true
      });
    } else if (type === "pdf") {
      thumb = createElement("div", {
        style: {
          width: "120px",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          border: "1px solid #ccc",
          background: "#f2f2f2",
          fontSize: "12px",
          cursor: "pointer"
        }
      }, ["📄 PDF"]);
    } else {
      thumb = Imagex({
        src,
        style: {
          width: "120px",
          height: "80px",
          objectFit: "cover",
          borderRadius: "4px",
          border: "1px solid #ccc",
          cursor: "pointer"
        }
      });
    }

    thumb.addEventListener("click", () => ZoomBox(mediaItems, index, type));
    return thumb;
  }));
}
