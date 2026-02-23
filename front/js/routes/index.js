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
  if (!loadContent._isHydrated) {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (token && userRaw) {
      let user = userRaw;
      try {
        user = JSON.parse(userRaw);
      } catch {}

      setState({ token, user }, true);
    }

    loadContent._isHydrated = true;
  }

  main.replaceChildren();

  if (!loadContent._headerRendered) {
    const headerContent = createheader();
    if (headerContent) header.appendChild(headerContent);
    loadContent._headerRendered = true;
  }

  const shouldShowNav = !["/home", "/merechats"].includes(url);

  if (shouldShowNav && !loadContent._navRendered) {
    const navContent = createNav();
    if (navContent) {
      nav.appendChild(navContent);
      loadContent._navRendered = true;
    }
  }

  if (loadContent._navRendered) {
    highlightActiveNav(url);
  }

  if (!loadContent._footerRendered) {
    const footerContent = Footer();
    if (footerContent) footer.appendChild(footerContent);
    loadContent._footerRendered = true;
  }

  await render(url, main);

  const routeState = getRouteState(url);
  if (routeState) {
    restoreScroll(main, routeState);
  }
}

/**
 * SPA PushState navigation
 * TDZ-safe: no module-scoped state
 */
function navigate(path, { storeRedirect = false } = {}) {
  if (!path) {
    console.error("🚨 navigate called with null or undefined!", new Error().stack);
    return;
  }

  if (navigate._isNavigating || window.location.pathname === path) return;

  navigate._isNavigating = true;

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
      navigate._isNavigating = false;
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


// import { createheader } from "../components/header.js";
// import { createNav, highlightActiveNav } from "../components/navigation.js";
// import { render } from "./router.js";
// import {
//   setState,
//   getRouteState,
//   saveScroll,
//   restoreScroll,
// } from "../state/state.js";
// import { Footer } from "../components/footer.js";

// let isNavigating = false;
// let isHeaderRendered = false;
// let isFooterRendered = false;
// let isNavRendered = false;
// let isHydrated = false;

// /**
//  * Loads layout and route content into static containers
//  * @param {string} url
//  */
// async function loadContent(url) {
//   const header = document.getElementById("pageheader");
//   const nav = document.getElementById("primary-nav");
//   const main = document.getElementById("content");
//   const footer = document.getElementById("pagefooter");

//   if (!header || !nav || !main || !footer) {
//     console.error("❌ Missing static layout containers in HTML.");
//     return;
//   }

//   /* -------------------- Hydrate persisted auth state once -------------------- */
//   if (!isHydrated) {
//     const token = localStorage.getItem("token");
//     const userRaw = localStorage.getItem("user");
//     const username = localStorage.getItem("username");

//     if (token) {
//       let user = null;
//       try {
//         user = userRaw ? JSON.parse(userRaw) : null;
//       } catch {
//         user = userRaw; // fallback in case user was stored as raw string
//       }

//       setState(
//         { token, user, username },
//         true
//       );
//     }

//     isHydrated = true;
//   }

//   /* -------------------- Clear only dynamic content -------------------- */
//   main.replaceChildren();

//   /* -------------------- Render header only once -------------------- */
//   if (!isHeaderRendered) {
//     const headerContent = createheader();
//     if (headerContent) header.appendChild(headerContent);
//     isHeaderRendered = true;
//   }

//   /* -------------------- Render nav once when allowed -------------------- */
//   if (!isNavRendered && url !== "/home" && url !== "/merechats") {
//     const navContent = createNav();
//     if (navContent) {
//       nav.appendChild(navContent);
//       isNavRendered = true;
//     }
//   }

//   /* -------------------- Highlight active nav item -------------------- */
//   highlightActiveNav(url);

//   /* -------------------- Render footer only once -------------------- */
//   if (!isFooterRendered) {
//     const footerContent = Footer();
//     if (footerContent) footer.appendChild(footerContent);
//     isFooterRendered = true;
//   }

//   /* -------------------- Render main route content -------------------- */
//   await render(url, main);

//   /* -------------------- Restore scroll -------------------- */
//   restoreScroll(main, getRouteState(url));
// }

// /**
//  * SPA PushState navigation
//  * @param {string} path
//  */
// // function navigate(path) {
// //   if (!path) {
// //     console.error("🚨 navigate called with null or undefined!", new Error().stack);
// //     return;
// //   }

// //   if (window.location.pathname === path || isNavigating) return;

// //   isNavigating = true;

// //   saveScroll(
// //     document.getElementById("content"),
// //     getRouteState(window.location.pathname)
// //   );

// //   history.pushState(null, "", path);

// //   loadContent(path)
// //     .catch((err) => console.error("Navigation failed:", err))
// //     .finally(() => {
// //       isNavigating = false;
// //     });
// // }
// function navigate(path, { storeRedirect = false } = {}) {
//   if (!path) {
//     console.error("🚨 navigate called with null or undefined!", new Error().stack);
//     return;
//   }

//   if (window.location.pathname === path || isNavigating) return;

//   // Save scroll before leaving current route
//   saveScroll(
//     document.getElementById("content"),
//     getRouteState(window.location.pathname)
//   );

//   // Optional redirect storage
//   if (storeRedirect) {
//     if (!["/", "/login", "/logout"].includes(window.location.pathname)) {
//       localStorage.setItem("redirectAfterLogin", window.location.pathname);
//     }
//   }

//   history.pushState(null, "", path);

//   loadContent(path)
//     .catch((err) => console.error("Navigation failed:", err))
//     .finally(() => {
//       isNavigating = false;
//     });
// }

// /**
//  * Initial page render
//  */
// async function renderPage() {
//   await loadContent(window.location.pathname);
// }

// export { navigate, renderPage, loadContent };
