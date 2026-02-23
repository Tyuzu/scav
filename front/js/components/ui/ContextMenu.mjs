// ContextMenu.mjs
import "../../../css/ui/ContextMenu.css";
import { createElement } from "../../components/createElement";

const ContextMenu = (() => {
  let menu = null;

  const createMenu = (options, x, y) => {
    removeMenu();

    menu = createElement("div", {
      class: "context-ctx",
      role: "menu"
    });

    options.forEach(({ label, action, disabled = false }) => {
      const item = createElement("div", {
        class: `ctx-item${disabled ? " disabled" : ""}`,
        role: "menuitem",
        tabindex: disabled ? -1 : 0
      }, label); // ✅ pass string directly

      if (!disabled) {
        item._action = action;
      }

      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    positionMenu(x, y);
    setupEventListeners();
    focusFirstItem();
  };

  const positionMenu = (x, y) => {
    const { offsetWidth, offsetHeight } = menu;
    const { innerWidth, innerHeight, scrollX, scrollY } = window;

    const left = Math.min(x, scrollX + innerWidth - offsetWidth);
    const top = Math.min(y, scrollY + innerHeight - offsetHeight);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const setupEventListeners = () => {
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".ctx-item:not(.disabled)");
      if (!item) return;
      item._action?.();
      removeMenu();
    });

    menu.addEventListener("keydown", (e) => {
      const items = [...menu.querySelectorAll(".ctx-item:not(.disabled)")];
      const current = document.activeElement;
      let idx = items.indexOf(current);

      if (e.key === "Escape") {
        e.preventDefault();
        removeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(idx + 1) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length].focus();
      } else if (e.key === "Enter" && current._action) {
        e.preventDefault();
        current._action();
        removeMenu();
      }
    });

    document.addEventListener("mousedown", outsideClickHandler);
    window.addEventListener("scroll", removeMenu, { passive: true });
    window.addEventListener("resize", removeMenu);
  };

  const outsideClickHandler = (e) => {
    if (!menu.contains(e.target)) {
      removeMenu();
    }
  };

  const focusFirstItem = () => {
    const first = menu.querySelector(".ctx-item:not(.disabled)");
    first?.focus();
  };

  const removeMenu = () => {
    if (menu) {
      document.removeEventListener("mousedown", outsideClickHandler);
      window.removeEventListener("scroll", removeMenu);
      window.removeEventListener("resize", removeMenu);
      menu.remove();
      menu = null;
    }
  };

  return createMenu;
})();

export default ContextMenu;
