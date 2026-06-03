import { createheader } from "../components/header.js";
import { createNav, highlightActiveNav } from "../components/navigation.js";
import { render } from "./router.js";
import {
  setState,
  getRouteState,
  saveScroll,
  restoreScroll
} from "../state/state.js";
import { Footer } from "../components/footer.js";

// Proper state object instead of function properties
const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

/**
 * Loads layout and route content into static containers
 * @param {string} url
 */
async function loadContent(url) {
  const header = document.getElementById("pageheader");
  const nav = document.getElementById("primary-nav");
  const main = document.getElementById("content");
  const footer = document.getElementById("pagefooter");

  if (!header || !nav || !main || !footer) {
    console.error("❌ Missing static layout containers in HTML.");
    return;
  }

  /* -------------------- Hydrate persisted auth state once -------------------- */
  if (!layoutState.isHydrated) {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (token && userRaw) {
      let user = userRaw;
      try {
        user = JSON.parse(userRaw);
      } catch { }

      setState({ token, user }, true);
    }

    layoutState.isHydrated = true;
  }

  main.replaceChildren();

  if (!layoutState.headerRendered) {
    const headerContent = createheader();
    if (headerContent) {
      header.appendChild(headerContent);
    }
    layoutState.headerRendered = true;
  }

// const shouldShowNav = !["/home", "/merechats"].includes(url);
  const shouldShowNav = !["/merechats"].includes(url);

  if (shouldShowNav && !layoutState.navRendered) {
    const navContent = createNav();
    if (navContent) {
      nav.appendChild(navContent);
      layoutState.navRendered = true;
    }
  }

  if (layoutState.navRendered) {
    highlightActiveNav(url);
  }

  if (!layoutState.footerRendered) {
    const footerContent = Footer();
    if (footerContent) {
      footer.appendChild(footerContent);
    }
    layoutState.footerRendered = true;
  }

  await render(url, main);

  const routeState = getRouteState(url);
  if (routeState) {
    restoreScroll(main, routeState);
  }
}

/**
 * SPA PushState navigation
 */
function navigate(path, { storeRedirect = false } = {}) {
  if (!path) {
    console.error("🚨 navigate called with null or undefined!", new Error().stack);
    return;
  }

  if (layoutState.isNavigating || window.location.pathname === path) {
    return;
  }

  layoutState.isNavigating = true;

  saveScroll(
    document.getElementById("content"),
    getRouteState(window.location.pathname)
  );

  if (storeRedirect) {
    if (!["/", "/login", "/logout"].includes(window.location.pathname)) {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }
  }

  history.pushState(null, "", path);

  loadContent(path)
    .catch(err => console.error("Navigation failed:", err))
    .finally(() => {
      layoutState.isNavigating = false;
    });
}

/* -------------------- Browser back / forward -------------------- */
window.addEventListener("popstate", () => {
  loadContent(window.location.pathname).catch(err =>
    console.error("Popstate navigation failed:", err)
  );
});

/**
 * Initial render
 */
async function renderPage() {
  await loadContent(window.location.pathname);
}

export { navigate, renderPage, loadContent };

