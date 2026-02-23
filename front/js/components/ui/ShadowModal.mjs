import "../../../css/ui/Modal.css";

let openModals = 0;
let bodyStyleEl = null;

function addBodyOverflowHidden() {
  if (!bodyStyleEl) {
    bodyStyleEl = document.createElement('style');
    bodyStyleEl.id = 'modal-body-style';
    bodyStyleEl.textContent = `body { overflow: hidden; }`;
    document.head.appendChild(bodyStyleEl);
  }
}

function removeBodyOverflowHidden() {
  if (openModals === 0 && bodyStyleEl) {
    bodyStyleEl.remove();
    bodyStyleEl = null;
  }
}

function createModalHeader(title, onClose, doc) {
  const header = doc.createElement('div');
  header.className = 'modal-header';

  const heading = doc.createElement('h3');
  heading.textContent = title;
  heading.id = `modal-title-${openModals}`;
  header.appendChild(heading);

  const closeButton = doc.createElement('button');
  closeButton.className = 'modal-close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.addEventListener('click', onClose);
  header.appendChild(closeButton);

  return { header, titleId: heading.id };
}

function createModalBody(content, doc) {
  const body = doc.createElement('div');
  body.className = 'modal-body';

  const contentNode = typeof content === 'function' ? content() : content;
  if (contentNode instanceof HTMLElement) {
    body.appendChild(contentNode);
  } else {
    body.textContent = contentNode?.toString() || '';
  }

  body.id = `modal-desc-${openModals}`;
  return { body, descId: body.id };
}

function createModalFooter(actions, doc) {
  if (typeof actions !== 'function') return null;

  const footer = doc.createElement('div');
  footer.className = 'modal-footer';

  const content = actions();
  if (content instanceof HTMLElement) {
    footer.appendChild(content);
  }
  return footer;
}

const Modal = ({
  title,
  content,
  onClose,
  size = 'medium',
  closeOnOverlayClick = true,
  autofocusSelector = null,
  returnDataOnClose = false,
  onConfirm = null,
  actions = null,
  onOpen = null,
  force = false
}) => {
  const host = document.createElement('div');
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.zIndex = 1000 + openModals * 10;

  const shadow = host.attachShadow({ mode: "open" });

  // inject css

// inline css (copied contents of Modal.css here)
const style = document.createElement("style");
style.textContent = `
/* Modal container */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.modal--fade-in {
  opacity: 1;
  pointer-events: auto;
}

.modal--fade-out {
  opacity: 0;
  pointer-events: none;
}

/* Overlay */
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  pointer-events: auto;
}

/* Dialog */
.modal-dialog {
  position: relative;
  border-radius: 6px;
  max-width: 90%;
  background-color: var(--color-bg);
  max-height: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  z-index: 10;
  pointer-events: auto;
  outline: none;
}

/* Sizes */
.modal--small .modal-dialog { width: 300px; }
.modal--medium .modal-dialog { width: 500px; }
.modal--large .modal-dialog { width: 800px; }

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}

/* Body */
.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1 1 auto;
}

/* Footer */
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #ddd;
  text-align: right;
}

/* Scrollbar styling for body */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.modal-body::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4px;
}

/* Responsive */
@media (max-width: 600px) {
  .modal-dialog { width: 90%; }
}

`;
shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = `modal modal--${size}`;
  dialog.setAttribute('tabindex', '-1');
  dialog.setAttribute('role', 'dialog');

  addBodyOverflowHidden();
  const previouslyFocused = document.activeElement;
  openModals++;

  const wrappedOnClose = (data) => {
    if (force) return;
    cleanup();
    if (returnDataOnClose) onClose?.(data);
    else onClose?.();
  };

  if (closeOnOverlayClick && !force) {
    overlay.addEventListener('click', () => wrappedOnClose());
  }

  const { header, titleId } = createModalHeader(title, () => wrappedOnClose(), document);
  const { body, descId } = createModalBody(content, document);
  const footer = createModalFooter(actions, document);

  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.setAttribute('aria-describedby', descId);

  dialog.appendChild(header);
  dialog.appendChild(body);
  if (footer) dialog.appendChild(footer);

  shadow.appendChild(overlay);
  shadow.appendChild(dialog);

  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const trapFocus = (e) => {
    if (force && e.key === 'Escape') return;
    const focusableEls = dialog.querySelectorAll(focusableSelectors);
    if (!focusableEls.length) return;

    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    } else if (e.key === 'Escape' && !force) {
      wrappedOnClose();
    } else if (e.key === 'Enter' && onConfirm) {
      e.preventDefault();
      onConfirm();
    }
  };

  dialog.addEventListener('keydown', trapFocus);
  dialog.classList.add('modal--fade-in');

  const modalContainer = document.getElementById('modalcon');
  if (!modalContainer) throw new Error('No element with id "modalcon" found');
  modalContainer.appendChild(host);

  if (onOpen) onOpen();

  if (autofocusSelector) {
    const el = dialog.querySelector(autofocusSelector);
    el?.focus();
  } else {
    dialog.focus();
  }

  function cleanup() {
    dialog.removeEventListener('keydown', trapFocus);
    dialog.classList.remove('modal--fade-in');
    dialog.classList.add('modal--fade-out');

    dialog.addEventListener('animationend', () => {
      host.remove();
    });

    openModals = Math.max(0, openModals - 1);
    removeBodyOverflowHidden();
    previouslyFocused?.focus?.();
  }

  if (returnDataOnClose) {
    let resolvePromise;
    const closed = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const wrappedClose = (data) => {
      wrappedOnClose(data);
      resolvePromise(data);
    };

    return {
      modal: host,
      close: wrappedClose,
      closed,
    };
  }

  return host;
};

export default Modal;
