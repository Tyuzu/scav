/**
 * DOM Element Creation Utilities
 * Unified module for creating and managing DOM elements
 */

/**
 * Universal element creator with support for events, styles, and attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes and special properties
 * @param {Array|string|number} children - Child elements or text content
 * @returns {HTMLElement} Created element
 *
 * @example
 * // Create a button with classes and event handler
 * const btn = createElement("button", {
 *   class: "btn btn-primary",
 *   events: { click: handleClick },
 *   dataset: { action: "submit" }
 * }, ["Click me"]);
 *
 * // Create styled div
 * const box = createElement("div", {
 *   style: { padding: "10px", background: "blue" }
 * }, ["Content"]);
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "events" && value && typeof value === "object") {
      // Handle event listeners
      for (const [eventName, handler] of Object.entries(value)) {
        if (typeof handler === "function") {
          element.addEventListener(eventName, handler);
        }
      }
    } else if ((key === "style" || key === "styles") && value && typeof value === "object") {
      // Handle inline styles
      for (const [prop, val] of Object.entries(value)) {
        element.style[prop] = val;
      }
    } else if (key === "class" && typeof value === "string") {
      // Handle class list
      const classes = value.trim().split(/\s+/).filter(c => c.length > 0);
      if (classes.length) {
        element.classList.add(...classes);
      }
    } else if (key === "dataset" && value && typeof value === "object") {
      // Handle data attributes
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue;
      }
    } else if (key in element) {
      // Directly assign known DOM properties
      element[key] = value;
    } else {
      // Fallback to setAttribute
      element.setAttribute(key, value);
    }
  }

  // Add children
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;

    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    } else {
      console.error("Invalid child passed to createElement:", child);
    }
  }

  return element;
}

/**
 * Create a button element
 * @param {Object} options - Button configuration
 * @param {string} options.text - Button text
 * @param {Array<string>} options.classes - CSS classes
 * @param {string} options.id - Element ID
 * @param {Object} options.events - Event handlers { eventName: handler }
 * @returns {HTMLButtonElement} Button element
 *
 * @example
 * const btn = createButton({
 *   text: "Submit",
 *   classes: ["btn", "btn-primary"],
 *   id: "submit-btn",
 *   events: { click: () => console.log("clicked") }
 * });
 */
export function createButton({ text, classes = [], id = "", events = {} }) {
  const button = createElement("button", {
    class: classes.join(" "),
    ...(id && { id }),
    events
  }, [text]);

  return button;
}

/**
 * Create a div-based button (for styling flexibility)
 * @param {Object} options - Button configuration (same as createButton)
 * @returns {HTMLDivElement} Div-based button element
 */
export function createDivButton({ text, classes = [], id = "", events = {} }) {
  const button = createElement("div", {
    class: classes.join(" "),
    role: "button",
    tabindex: "0",
    ...(id && { id }),
    events
  }, [text]);

  return button;
}

/**
 * Create a heading element
 * @param {string} tag - Heading tag (h1-h6)
 * @param {string} text - Heading text
 * @param {Array<string>} classes - CSS classes
 * @returns {HTMLHeadingElement} Heading element
 */
export function createHeading(tag, text, classes = []) {
  return createElement(tag, {
    class: classes.join(" ")
  }, [text]);
}

/**
 * Create an unordered list element
 * @param {string} id - List ID
 * @param {Array<string>} classes - CSS classes
 * @returns {HTMLUListElement} List element
 */
export function createList(id, classes = []) {
  return createElement("ul", {
    ...(id && { id }),
    class: classes.join(" ")
  });
}

/**
 * Create an anchor/link element
 * @param {string} id - Link ID
 * @param {Array<string>} classes - CSS classes
 * @returns {HTMLAnchorElement} Anchor element
 */
export function createLink(id, classes = []) {
  return createElement("a", {
    ...(id && { id }),
    class: classes.join(" ")
  });
}

/**
 * Create a container element
 * @param {Array<string>} classes - CSS classes
 * @param {string} id - Container ID
 * @param {string} containerType - HTML tag (default: div)
 * @returns {HTMLElement} Container element
 */
export function createContainer(classes = [], id = "", containerType = "div") {
  return createElement(containerType, {
    class: classes.join(" "),
    ...(id && { id })
  });
}

/**
 * Create an image element with lazy loading
 * @param {Object} options - Image configuration
 * @param {string} options.src - Image source URL
 * @param {string} options.alt - Alt text
 * @param {Array<string>} options.classes - CSS classes
 * @returns {HTMLImageElement} Image element
 */
export function createImage({ src, alt, classes = [] }) {
  return createElement("img", {
    src,
    alt,
    loading: "lazy",
    class: classes.join(" ")
  });
}

/**
 * Render a component into a container
 * @param {HTMLElement} component - Component to render
 * @param {string} containerId - Target container ID
 */
export function renderComponent(component, containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.appendChild(component);
  } else {
    console.warn(`Container with ID "${containerId}" not found`);
  }
}
