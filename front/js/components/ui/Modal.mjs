import "../../../css/ui/Modal.css";
import { createElement } from "../domUtils.js";
import { createFocusTrap } from "../utils/focusTrap.js";

let openModals = 0;
let bodyStyleEl = null;

function lockBodyScroll() {
  if (!bodyStyleEl) {
    bodyStyleEl = createElement("style", { id: "modal-body-style" }, [
      document.createTextNode("body { overflow: hidden !important; }")
    ]);
    document.head.appendChild(bodyStyleEl);
  }
}

function unlockBodyScroll() {
  if (openModals === 0 && bodyStyleEl) {
    bodyStyleEl.remove();
    bodyStyleEl = null;
  }
}

function getDurationMs(el) {
  const cs = window.getComputedStyle(el);

  const parseTime = (val) => {
    if (!val) return 0;
    val = val.split(",")[0].trim();
    const num = parseFloat(val) || 0;
    return val.endsWith("s") ? num * 1000 : num;
  };

  return Math.max(
    parseTime(cs.animationDuration) + parseTime(cs.animationDelay),
    parseTime(cs.transitionDuration) + parseTime(cs.transitionDelay),
    0
  );
}

export default function Modal({
  title = "",
  content = "",
  onClose = null,
  onConfirm = null,
  onOpen = null,
  onBeforeClose = null,
  onAfterClose = null,
  size = "medium",
  variant = "default",
  closeOnOverlayClick = true,
  showHeader = true,
  showCloseButton = true,
  autofocus = true,
  autofocusSelector = null,
  force = false,
  returnDataOnClose = false,
  actions = null
} = {}) {
  openModals += 1;
  const uid = openModals;
  const zIndex = 1000 + uid * 10;

  const overlay = createElement("div", { class: "modal-overlay" });
  const dialog = createElement("div", {
    class: "modal-dialog",
    tabindex: "-1",
    role: "dialog"
  });

  const modal = createElement(
    "div",
    {
      class: `modal modal--${size} modal--${variant}`,
      style: `z-index: ${zIndex};`
    },
    [overlay, dialog]
  );

  lockBodyScroll();

  const previouslyFocused = document.activeElement;
  let focusTrapInstance = null;

  const cleanup = () => {
    focusTrapInstance?.cleanup();

    modal.classList.remove("modal--fade-in");
    modal.classList.add("modal--fade-out");

    const animDuration = Math.max(
      getDurationMs(modal),
      getDurationMs(dialog),
      300
    );

    setTimeout(() => {
      modal.remove();
      openModals = Math.max(0, openModals - 1);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    }, animDuration + 50);
  };

  const wrappedClose = (data) => {
    if (force) return;
    onBeforeClose?.();
    cleanup();
    returnDataOnClose ? onClose?.(data) : onClose?.();
    onAfterClose?.();
  };

  if (closeOnOverlayClick && !force) {
    overlay.addEventListener("click", () => wrappedClose());
  }

  // Header
  if (showHeader && (title || showCloseButton)) {
    const header = createElement("div", { class: "modal-header" });

    if (title) {
      const titleEl = createElement("h3", { id: `modal-title-${uid}` }, [title]);
      header.appendChild(titleEl);
      dialog.setAttribute("aria-labelledby", `modal-title-${uid}`);
    }

    if (showCloseButton) {
      const btn = createElement(
        "button",
        { class: "modal-close", "aria-label": "Close" },
        ["×"]
      );
      btn.addEventListener("click", () => wrappedClose());
      header.appendChild(btn);
    }

    dialog.appendChild(header);
  }

  // Body
  const contentNode =
    typeof content === "function" ? content() : content;

  const body = createElement(
    "div",
    {
      class: "modal-body",
      id: `modal-desc-${uid}`
    },
    [
      contentNode instanceof HTMLElement
        ? contentNode
        : String(contentNode ?? "")
    ]
  );

  dialog.setAttribute("aria-describedby", `modal-desc-${uid}`);
  dialog.appendChild(body);

  // Footer
  if (typeof actions === "function") {
    const act = actions();
    if (act instanceof HTMLElement) {
      dialog.appendChild(
        createElement("div", { class: "modal-footer" }, [act])
      );
    }
  }

  dialog.setAttribute("aria-modal", "true");

  // Focus trap
  focusTrapInstance = createFocusTrap(dialog, {
    cycleOnTab: true,
    closeOnEscape: !force,
    onEscape: wrappedClose,
    enterConfirm: true,
    onConfirm: () => onConfirm?.()
  });

  const container = document.getElementById("modalcon");
  if (!container) {
    cleanup();
    throw new Error("Modal container with id 'modalcon' not found");
  }

  modal.classList.add("modal--fade-in");
  container.appendChild(modal);

  onOpen?.();

  if (autofocus) {
    setTimeout(() => {
      autofocusSelector
        ? dialog.querySelector(autofocusSelector)?.focus()
        : dialog.focus();
    }, 0);
  }

  if (returnDataOnClose) {
    let resolve;
    const closed = new Promise((r) => (resolve = r));

    const close = (data) => {
      wrappedClose(data);
      resolve(data);
    };

    return { modal, dialog, overlay, close, closed };
  }

  return { modal, dialog, overlay, close: wrappedClose };
}