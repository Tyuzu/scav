import { createElement } from "./createElement.js";
import { notifSVG, cartSVG, chatSVG, menuSVG, searchSVG } from "./svgs.js";
import { navigate } from "../routes/index.js";
import { getState, subscribeDeep } from "../state/state.js";
import { openNotificationsModal } from "../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../utils/svgIconButton.js";
// import { tmessaging } from "./tumblrSvgs.js";
// import { openCartModal } from "../services/cart/cartModal.js";

// --- Update container children based on login state
function updateNav(container, divs) {
  const isLoggedIn = !!getState("token"); // use token for reactive auth

  container.innerHTML = "";

  container.appendChild(createIconButton({
    classSuffix: "pause",
    svgMarkup: menuSVG,
    onClick: toggleSidebar,
    label: "" // ✅ no text
  }));

  container.appendChild(createIconButton({
    classSuffix: "dld",
    svgMarkup: searchSVG,
    onClick: () => navigate("/search"),
    label: "" // ✅ no text
  }));

  if (isLoggedIn) {

    container.appendChild(createIconButton({
      classSuffix: "play",
      svgMarkup: chatSVG,
      onClick: () => navigate("/newchats"),
      label: ""
    }));
    
    container.appendChild(createIconButton({
      classSuffix: "stop",
      svgMarkup: notifSVG,
      onClick: openNotificationsModal,
      label: ""
    }));
    
    container.appendChild(createIconButton({
      classSuffix: "edit",
      svgMarkup: cartSVG,
      onClick: () => navigate("/cart"),
      label: ""
    }));


    // container.appendChild(createIconButton({
    //   classSuffix: "edit",
    //   svgMarkup: "",
    //   onClick: () => navigate("/profile"),
    //   label: divs.imglink
    // }));
  }
}

// --- Sticky container (reactive)
export function Sticky(divs) {
  const container = createElement("div", { class: "plypzstp" });

  updateNav(container, divs);

  // Subscribe to token changes instead of user directly
  const unsub = subscribeDeep("token", () => updateNav(container, divs));

  // Optional: cleanup if container is removed
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      unsub?.();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return container;
}

export { Sticky as sticky };
