/**
 * Focus Trap Utility
 * Manages keyboard navigation and focus containment within a container
 */

/**
 * Creates a focus trap handler for keyboard navigation
 * @param {HTMLElement} container - The element to trap focus within
 * @param {Object} options - Configuration options
 * @param {boolean} options.cycleOnTab - Whether to cycle focus on Tab (default: true)
 * @param {boolean} options.closeOnEscape - Whether to close on Escape key
 * @param {Function} options.onEscape - Callback when Escape is pressed
 * @param {boolean} options.enterConfirm - Whether Enter triggers confirm
 * @param {Function} options.onConfirm - Callback when Enter is pressed
 * @param {string} options.focusSelector - Custom selector for focusable elements
 * @returns {Object} Object with handler function and cleanup method
 */
export function createFocusTrap(container, options = {}) {
  const {
    cycleOnTab = true,
    closeOnEscape = false,
    onEscape = null,
    enterConfirm = false,
    onConfirm = null,
    focusSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
  } = options;

  let isBound = false;

  const getFocusableElements = () => {
    return Array.from(container.querySelectorAll(focusSelector))
      .filter(el => !el.disabled);
  };

  const trapHandler = (e) => {
    const focusables = getFocusableElements();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const activeEl = document.activeElement;

    if (e.key === "Tab" && cycleOnTab) {
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    if (e.key === "Escape" && closeOnEscape && onEscape) {
      e.preventDefault();
      onEscape();
    }

    if (e.key === "Enter" && enterConfirm && onConfirm) {
      e.preventDefault();
      onConfirm();
    }
  };

  const bind = () => {
    if (!isBound) {
      container.addEventListener("keydown", trapHandler);
      isBound = true;
    }
  };

  const unbind = () => {
    if (isBound) {
      container.removeEventListener("keydown", trapHandler);
      isBound = false;
    }
  };

  bind();

  return {
    handler: trapHandler,
    bind,
    unbind,
    cleanup: unbind,
    isActive: () => isBound
  };
}
