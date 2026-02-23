import "../../../css/ui/SightboxZoom.css";
import { createZoomableMedia } from "./createZoomableMedia";
import { createElement } from "../../components/createElement";
import { createIconButton } from "../../utils/svgIconButton";
import { xSVG } from "../svgs";

const Sightbox = (mediaSrc, mediaType = "image") => {
  if (document.getElementById("sightbox")) return;

  const overlay = createElement("div", { 
    class: "sightboxz-overlay", 
    events: { click: () => closeSightbox() } 
  });

  const { container, mediaEl, resetZoomBtn } = createZoomableMedia(mediaSrc, mediaType);

  
  // --- close Buttons ---
  const closeButton = createIconButton({
    classSuffix: "sightboxz-close bonw",
    svgMarkup: xSVG,
    onClick: closeSightbox ,
    label: "",
    ariaLabel: "Close"
  });

  // const closeButton = createElement("button", { 
  //   class: "sightboxz-close", 
  //   "aria-label": "Close", 
  //   events: { click: () => closeSightbox() } 
  // }, [document.createTextNode("×")]);

  const content = createElement("div", { 
    class: "sightboxz-content", 
    tabindex: "-1" 
  }, [container, closeButton, resetZoomBtn]);

  const sightbox = createElement("div", { id: "sightbox", class: "sightboxz" }, [
    overlay,
    content
  ]);

  document.getElementById("app").appendChild(sightbox);

  content.focus();

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSightbox();
    } else if (e.key === "Tab") {
      const focusable = [closeButton, resetZoomBtn];
      const currentIndex = focusable.indexOf(document.activeElement);
      if (e.shiftKey && currentIndex === 0) {
        e.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!e.shiftKey && currentIndex === focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  }

  function closeSightbox() {
    if (!document.body.contains(sightbox)) return;
    sightbox.remove();
    window.removeEventListener("keydown", onKeyDown);
  }

  window.addEventListener("keydown", onKeyDown);

  return sightbox;
};

export default Sightbox;
