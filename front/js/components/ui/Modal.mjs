import "../../../css/ui/Modal.css";
import { createElement } from "../../components/createElement.js";

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

function makeHeader(title, onClose, uid, showCloseButton) {
  if (!title && !showCloseButton) return null;

  const heading = title
    ? createElement("h3", { id: `modal-title-${uid}` }, [title])
    : null;

  const closeBtn = showCloseButton
    ? createElement("button", {
        class: "modal-close",
        "aria-label": "Close"
      }, ["×"])
    : null;

  closeBtn?.addEventListener("click", onClose);

  return {
    header: createElement(
      "div",
      { class: "modal-header" },
      [heading, closeBtn].filter(Boolean)
    ),
    titleId: heading?.id || null
  };
}

function makeBody(content, uid) {
  const node = typeof content === "function" ? content() : content;
  const children = node instanceof HTMLElement
    ? [node]
    : [document.createTextNode(node == null ? "" : String(node))];

  const body = createElement(
    "div",
    { class: "modal-body", id: `modal-desc-${uid}` },
    children
  );

  return { body, descId: body.id };
}

function simpleDurationMs(el) {
  const cs = window.getComputedStyle(el);
  const toMs = v => {
    if (!v) return 0;
    v = v.split(",")[0].trim();
    if (v.endsWith("ms")) return parseFloat(v) || 0;
    if (v.endsWith("s")) return (parseFloat(v) || 0) * 1000;
    return parseFloat(v) || 0;
  };
  return Math.max(
    toMs(cs.animationDuration) + toMs(cs.animationDelay),
    toMs(cs.transitionDuration) + toMs(cs.transitionDelay),
    0
  );
}

export default function Modal({
  // existing
  title = "",
  content = "",
  onClose = null,
  onConfirm = null,
  onOpen = null,
  size = "medium",
  closeOnOverlayClick = true,
  autofocusSelector = null,
  returnDataOnClose = false,
  actions = null,
  force = false,

  // NEW (all optional, backward-safe)
  variant = "default",          // default | theater | alert | sheet
  showHeader = true,
  showCloseButton = true,
  autofocus = true,
  flushBody = false,
  onBeforeClose = null,
  onAfterClose = null
} = {}) {
  openModals += 1;
  const uid = openModals;

  const zBase = 1000;
  const zIndex = zBase + uid * 10;

  const overlay = createElement("div", { class: "modal-overlay" });
  const dialog = createElement("div", {
    class: "modal-dialog",
    tabindex: "-1",
    role: "dialog"
  });

  const modal = createElement("div", {
    class: `modal modal--${size} modal--${variant}`,
    style: `z-index:${zIndex};`
  }, [overlay, dialog]);

  lockBodyScroll();
  const previouslyFocused = document.activeElement;

  const cleanup = () => {
    dialog.removeEventListener("keydown", trap);
    modal.classList.remove("modal--fade-in");
    modal.classList.add("modal--fade-out");

    const ms = Math.max(
      simpleDurationMs(modal),
      simpleDurationMs(dialog),
      300
    );

    setTimeout(() => {
      modal.remove();
      openModals = Math.max(0, openModals - 1);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    }, ms + 40);
  };

  const wrappedClose = (data) => {
    if (force) return;
    onBeforeClose?.();
    cleanup();
    if (returnDataOnClose) onClose?.(data);
    else onClose?.();
    onAfterClose?.();
  };

  if (closeOnOverlayClick && !force) {
    overlay.addEventListener("click", () => wrappedClose());
  }

  let titleId = null;
  if (showHeader) {
    const headerData = makeHeader(
      title,
      () => wrappedClose(),
      uid,
      showCloseButton
    );

    if (headerData) {
      dialog.appendChild(headerData.header);
      titleId = headerData.titleId;
    }
  }

  const { body, descId } = makeBody(content, uid);
  if (flushBody) body.classList.add("modal-body--flush");

  dialog.appendChild(body);

  if (typeof actions === "function") {
    const act = actions();
    if (act instanceof HTMLElement) {
      const footer = createElement("div", { class: "modal-footer" }, [act]);
      dialog.appendChild(footer);
    }
  }

  dialog.setAttribute("aria-modal", "true");
  if (titleId) dialog.setAttribute("aria-labelledby", titleId);
  dialog.setAttribute("aria-describedby", descId);

  const focusableSel =
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

  function trap(e) {
    const focusables = Array
      .from(dialog.querySelectorAll(focusableSel))
      .filter(n => !n.disabled);

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === "Escape" && !force) {
      wrappedClose();
    } else if (
      e.key === "Enter" &&
      onConfirm &&
      variant !== "theater"
    ) {
      e.preventDefault();
      onConfirm();
    }
  }

  dialog.addEventListener("keydown", trap);

  const container = document.getElementById("modalcon");
  if (!container) {
    dialog.removeEventListener("keydown", trap);
    unlockBodyScroll();
    openModals = Math.max(0, openModals - 1);
    throw new Error('No element with id "modalcon" found');
  }

  modal.classList.add("modal--fade-in");
  container.appendChild(modal);

  onOpen?.();

  if (autofocus) {
    setTimeout(() => {
      if (autofocusSelector) {
        dialog.querySelector(autofocusSelector)?.focus();
      } else {
        dialog.focus();
      }
    }, 0);
  }

  if (returnDataOnClose) {
    let resolve;
    const closed = new Promise(r => (resolve = r));
    const close = (data) => {
      wrappedClose(data);
      resolve(data);
    };
    return { modal, dialog, overlay, close, closed };
  }

  return { modal, dialog, overlay, close: wrappedClose };
}
