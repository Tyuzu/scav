// Span component with enhanced functionality
const NoLink = (
  title = "Click Me", // Default title
  id = "", // Default empty ID
  events = {}, // Event handlers
  classes = "",
  styles = {"cursor":"pointer"} // Inline styles
) => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Span component.");
  }

  // Create the span element
  const span = document.createElement("span");
  span.textContent = title;
  span.id = id;

  // Apply inline styles dynamically
  for (const [key, value] of Object.entries(styles)) {
    span.style[key] = value;
  }

  // Add classes dynamically
  if (classes) {
    span.classList.add(...classes.split(" "));
  }

  // Add default class
  span.classList.add("span");

  // Attach custom event listeners
  for (const [event, handler] of Object.entries(events)) {
    if (typeof handler === "function") {
      span.addEventListener(event, handler);
    }
  }

  // // Add fallback for missing functionality
  // span.onclick = span.onclick || (() => alert(`${title} span clicked!`));

  return span;
};

export default NoLink;
export { NoLink };
