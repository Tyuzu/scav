// Button component with enhanced functionality
const Button = (
  title = "Click Me", // Default title
  id = "", // Default empty ID
  events = {}, // Event handlers
  classes = "",
  styles = {} // Inline styles
) => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Button component.");
  }

  // Create the button element
  const button = document.createElement("button");
  button.textContent = title;
  button.id = id;

  // Apply inline styles dynamically
  for (const [key, value] of Object.entries(styles)) {
    button.style[key] = value;
  }

  // Add classes dynamically
  if (classes) {
    button.classList.add(...classes.split(" "));
  }

  // Add default class
  button.classList.add("button");

  // Attach custom event listeners
  for (const [event, handler] of Object.entries(events)) {
    if (typeof handler === "function") {
      button.addEventListener(event, handler);
    }
  }

  // // Add fallback for missing functionality
  // button.onclick = button.onclick || (() => alert(`${title} button clicked!`));

  return button;
};

export default Button;
export { Button };
