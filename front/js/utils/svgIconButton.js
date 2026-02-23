import { createElement } from "../components/createElement";

// --- Icon button utility with optional label and aria-label ---
export function createIconButton({ classSuffix, svgMarkup, onClick, label = "", id = "", ariaLabel = "" }) {
  const button = createElement("div", { 
    class: `logoicon ${classSuffix}`, 
    id,
    role: "button",
    "aria-label": ariaLabel || label || "Icon Button",
    tabIndex: 0
  });

  // Wrap SVG in span
  const iconSpan = createElement("span", {});
  iconSpan.innerHTML = svgMarkup;

  const children = [iconSpan];

  // If label text provided, add another span visually
  if (label) {
    const textSpan = createElement("span", {}, [label]);
    children.push(textSpan);
  }

  children.forEach(child => button.appendChild(child));

  // Click handler
  if (onClick) {
    const clickHandler = (e) => { 
      e.preventDefault(); 
      onClick(); 
    };
    button.addEventListener("click", clickHandler);

    // Keyboard accessibility (Enter/Space)
    const keyHandler = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    };
    button.addEventListener("keydown", keyHandler);

    // Return a cleanup function for removing listeners if needed
    button.cleanup = () => {
      button.removeEventListener("click", clickHandler);
      button.removeEventListener("keydown", keyHandler);
    };
  }

  return button;
}
