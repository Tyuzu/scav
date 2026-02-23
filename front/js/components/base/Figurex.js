import "../../../css/ui/Figure.css";

// Figure component with responsive image and figcaption
const Figurex = (
  src, // Primary image source
  srcset = "", // Responsive image sources
  sizes = "", // Sizes for responsive images
  alt = "Image description", // Accessibility fallback text
  caption = "Default caption", // Caption text
  id = "", // Optional ID
  classes = "", // Additional classes
  styles = {}, // Inline styles
  events = {} // Custom event listeners
) => {
  // Input validation
  if (!src || typeof src !== "string") {
    throw new Error("A valid 'src' attribute is required for the Figure component.");
  }

  // Create the figure element
  const figure = document.createElement("figure");
  figure.id = id;

  // Apply inline styles dynamically
  for (const [key, value] of Object.entries(styles)) {
    figure.style[key] = value;
  }

  // Add classes dynamically
  if (classes) {
    figure.classList.add(...classes.split(" "));
  }

  // Add default class
  figure.classList.add("figure");

  // Create the image element
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt; // Ensures accessibility
  if (srcset) img.srcset = srcset;
  if (sizes) img.sizes = sizes;

  // Add custom event listeners to the image
  for (const [event, handler] of Object.entries(events)) {
    if (typeof handler === "function") {
      img.addEventListener(event, handler);
    }
  }

  // Create the figcaption element
  const figcaption = document.createElement("figcaption");
  figcaption.textContent = caption;

  // Append image and figcaption to figure
  figure.appendChild(img);
  figure.appendChild(figcaption);

  return figure;
};

export default Figurex;
export { Figurex };
