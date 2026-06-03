import { createElement } from "./createElement.js";
// eslint-disable-next-line no-unused-vars
import {
  notifSVG,
  cartSVG,
  chatSVG,
  menuSVG,
  searchSVG,
} from "./svgs.js";

import { navigate } from "../routes/index.js";
import { getState, subscribeDeep } from "../state/state.js";
import { openNotificationsModal } from "../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../utils/svgIconButton.js";

// Helper to reduce repetition
const makeButton = (classSuffix, svgMarkup, onClick) =>
  createIconButton({
    classSuffix,
    svgMarkup,
    onClick,
    label: "",
  });

function updateNav(container) {
  const isLoggedIn = !!getState("token");

  const buttons = [
    makeButton("pause", menuSVG, toggleSidebar),

    makeButton("dld", searchSVG, () => navigate("/search")),

    ...(isLoggedIn
      ? [
          makeButton("play", chatSVG, () => navigate("/newchats")),

          makeButton("stop", notifSVG, openNotificationsModal),

          makeButton("edit", cartSVG, () => navigate("/cart")),
        ]
      : []),
  ];

  container.replaceChildren(...buttons);
}

export function Sticky() {
  const container = createElement("div", {
    class: "plypzstp",
  });

  updateNav(container);

  let previousLoggedIn = !!getState("token");

  const unsub = subscribeDeep("token", () => {
    const currentLoggedIn = !!getState("token");

    // Only rebuild when auth state actually changes
    if (currentLoggedIn !== previousLoggedIn) {
      previousLoggedIn = currentLoggedIn;
      updateNav(container);
    }
  });

  // Cleanup when removed from DOM
  const observer = new MutationObserver(() => {
    if (!container.isConnected) {
      unsub?.();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return container;
}

export { Sticky as sticky };