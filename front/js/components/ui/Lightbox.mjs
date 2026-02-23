import "../../../css/ui/Sightbox.css";
import { createIconButton } from "../../utils/svgIconButton";
import Imagex from "../base/Imagex";
import { xSVG } from "../svgs";

const LightBox = (div) => {
  // prevent duplicate instance
  if (document.getElementById("sightbox")) return;

  const lightbox = document.createElement("div");
  lightbox.id = "sightbox";
  lightbox.className = "sightbox";

  const overlay = document.createElement("div");
  overlay.className = "sightbox-overlay";
  overlay.addEventListener("click", closeLightBox);

  const content = document.createElement("div");
  content.className = "sightbox-content";
  content.setAttribute("tabindex", "-1");

  content.appendChild(div);

  // // close button
  // const closeButton = document.createElement("button");
  // closeButton.className = "sightbox-close";
  // closeButton.textContent = "×";
  // closeButton.setAttribute("aria-label", "Close");
  // closeButton.addEventListener("click", closeLightBox);
  // content.appendChild(closeButton);


  // --- close Button ---
  const closeButton = createIconButton({
    classSuffix: "sightbox-close",
    svgMarkup: xSVG,
    onClick: closeLightBox,
    label: "",
    ariaLabel: "Close"
  });
  // closeButton.addEventListener("click", closeLightBox);
  content.appendChild(closeButton);


  // append DOM
  lightbox.appendChild(overlay);
  lightbox.appendChild(content);
  document.getElementById("app").appendChild(lightbox);

  // focus trap
  content.focus();

  // history push
  history.pushState({ lightboxOpen: true }, "");

  // esc + focus trap listener
  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightBox();
    } else if (e.key === "Tab") {
      // trap focus inside content
      const focusable = [closeButton];
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

  // back button
  function onPopState(e) {
    if (e.state && e.state.lightboxOpen) {
      closeLightBox(true);
    }
  }

  // clean close
  function closeLightBox(fromPop = false) {
    if (!document.body.contains(lightbox)) return;
    lightbox.remove();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPopState);
    if (!fromPop) history.back();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);

  return lightbox;
};

export default LightBox;
