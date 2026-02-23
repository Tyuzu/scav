import { getState, isAdmin, subscribeDeep, webSiteName } from "../state/state.js";
import { navigate } from "../routes/index.js";
import { logout } from "../services/auth/authService.js";
import { settingsSVG, moonSVG, profileSVG, shopBagSVG, logoutSVG, cardSVG } from "./svgs.js";
import { createElement } from "../components/createElement.js";
import { resolveImagePath, EntityType, PictureType } from "../utils/imagePaths.js";
import Imagex from "./base/Imagex.js";
import { sticky } from "./sticky.js";
import Button from "./base/Button.js";

const themes = ["light", "dark", "solarized", "dimmed"];
let currentThemeIndex = 0;

function loadTheme() {
  const saved = localStorage.getItem("theme");
  const index = themes.indexOf(saved);
  if (index >= 0) {
    document.documentElement.dataset.theme = saved;
    currentThemeIndex = index;
  }
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const theme = themes[currentThemeIndex];
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

function createIconButton(svg, href, onClick) {
  const icon = createElement("span", { class: "icon" }, []);
  icon.innerHTML = svg;

  const anchor = createElement("div", { class: "iconic-button" }, [icon]);
  if (href) anchor.href = href;
  if (onClick) anchor.addEventListener("click", onClick);

  return anchor;
}

function createDropdownMenu(id, labelText, items) {
  const toggle = createElement("button", { id, class: "menu-toggle" }, [labelText]);
  const menu = createElement("div", { class: "menu-content", "aria-label": labelText }, []);

  items.forEach(({ href, text }) => {
    const link = createElement("a", { class: "menu-item", href: `${text}` }, [text]);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(href);
      menu.classList.toggle("open");
    });
    menu.append(link);
  });

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  return createElement("div", { class: "logoicon dropdown" }, [toggle, menu]);
}

export function createProfileSection(userId) {
  // Get user object from state
  const user = getState("user") || {};
  const username = user.username || "Profile";

  // Profile picture
  const img = Imagex({
    src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${userId}.jpg`),
    alt: username,
    classes: "profile-pic"
  });

  const toggle = createElement("div", { class: "profile-toggle", tabIndex: 0 }, [img]);

  // Menu links
  const links = [
    { href: "/profile", text: username, icon: profileSVG },
    { href: "/my-orders", text: "My Orders", icon: shopBagSVG },
    ...(isAdmin() ? [{ href: "/admin", text: "Admin", icon: adminSVG }] : []),
    { href: "/wallet", text: "Wallet", icon: cardSVG },
    { href: "/settings", text: "Settings", icon: settingsSVG }
  ];

  const menu = createElement("div", { class: "profile-menu" }, []);

  links.forEach(({ href, text, icon }) => {
    const label = createElement("span", {}, [text]);
    const iconSpan = createElement("span", {}, []);
    if (icon) iconSpan.innerHTML = icon;

    const link = createElement("a", { class: "menu-item", href }, [iconSpan, label]);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(href);
    });

    menu.append(link);
  });

  // Logout button
  const logoutBtn = createElement("button", { class: "menu-item logout" }, []);
  logoutBtn.innerHTML = logoutSVG;
  logoutBtn.append(createElement("span", {}, ["Logout"]));
  logoutBtn.addEventListener("click", logout);
  menu.append(logoutBtn);

  // Toggle menu open/close
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      menu.classList.toggle("open");
    }
  });

  document.addEventListener("click", () => menu.classList.remove("open"));

  return createElement("div", { class: "dropdown" }, [toggle, menu]);
}

// export function createProfileSection(userId) {
//   const username = getState("username");
//   const img = Imagex({
//     src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${userId}.jpg`),
//     alt: "Profile",
//     classes: "profile-pic"
//   });

//   const toggle = createElement("div", { class: "profile-toggle", tabIndex: 0 }, [img]);

//   const links = [
//     { href: "/profile", text: username, icon: profileSVG },
//     { href: "/my-orders", text: "My Orders", icon: shopBagSVG },
//     ...(isAdmin() ? [{ href: "/admin", text: "Admin" }] : []),
//     { href: "/wallet", text: "Wallet", icon: cardSVG },
//     { href: "/settings", text: "Settings", icon: settingsSVG }
//   ];

//   const menu = createElement("div", { class: "profile-menu" }, []);

//   links.forEach(({ href, text, icon }) => {
//     const label = createElement("span", {}, [text]);
//     const iconSpan = createElement("span", {}, []);
//     if (icon) iconSpan.innerHTML = icon;

//     const link = createElement("a", { class: "menu-item", href }, [iconSpan, label]);
//     link.addEventListener("click", (e) => {
//       e.preventDefault();
//       navigate(href);
//     });

//     menu.append(link);
//   });

//   const logoutBtn = createElement("button", { class: "menu-item logout" }, []);
//   logoutBtn.innerHTML = logoutSVG;
//   logoutBtn.append(createElement("span", {}, ["Logout"]));
//   logoutBtn.addEventListener("click", logout);
//   menu.append(logoutBtn);

//   toggle.addEventListener("click", (e) => {
//     e.stopPropagation();
//     menu.classList.toggle("open");
//   });

//   toggle.addEventListener("keydown", (e) => {
//     if (e.key === "Enter" || e.key === " ") {
//       e.preventDefault();
//       menu.classList.toggle("open");
//     }
//   });

//   document.addEventListener("click", () => menu.classList.remove("open"));

//   return createElement("div", { class: "dropdown" }, [toggle, menu]);
// }

function renderUserSection() {
  const container = createElement("div", { class: "user-area" }, []);

  function update() {
    container.replaceChildren();
    const token = getState("token");
    const userId = getState("user");

    if (token && userId) {
      container.append(createProfileSection(userId));
    } else {
      const loginBtn = Button("Login", "login-button", {
        click: () => {
          // storeRedirect();
          navigate("/login");
        }
      }, "login-btn", { border: "none", cursor: "pointer" });

      container.append(loginBtn);
    }
  }

  subscribeDeep("token", update);
  subscribeDeep("userProfile.role", update);

  update();
  return container;
}

function buildNav() {
  const nav = createElement("div", { class: "header-content" }, []);

  const token = getState("token");

  if (token) {
    const createLinks = [
      { href: "/create-event", text: "Event" },
      { href: "/create-place", text: "Place" },
      { href: "/create-artist", text: "Artist" },
      { href: "/create-post", text: "Post" },
      { href: "/create-baito", text: "Baito" },
      { href: "/create-farm", text: "Farm" },
      { href: "/create-itinerary", text: "Itinerary" },
      { href: "/create-recipe", text: "Recipe" }
    ];
    nav.append(createDropdownMenu("create-menu", "Create", createLinks));
  }

  nav.append(
    createIconButton(moonSVG, null, toggleTheme),
    renderUserSection()
  );

  return nav;
}

function enableNavAutoUpdate(navRef) {
  function updateNav() {
    const newNav = buildNav();
    navRef.replaceWith(newNav);
    navRef = newNav;
  }

  subscribeDeep("token", updateNav);
  subscribeDeep("userProfile.role", updateNav);
}

function createHeader() {
  const header = document.getElementById("pageheader");
  if (!header || header.hasChildNodes()) return;

  header.className = "main-header";

  const logo = createElement("div", { class: "logo" }, [
    createElement("a", { href: "/home", class: "logo-link" }, [webSiteName])
  ]);

  const sky = createElement("div", { class: "hflexcen" }, []);
  sky.append(
    sticky({
      imglink: Imagex({
        src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${getState("user")}.jpg`),
        alt: "Profile",
        classes: "profile-pic"
      })
    })
  );

  let nav = buildNav();
  header.append(logo, sky, nav);

  enableNavAutoUpdate(nav);

  loadTheme();
}

export { createHeader as createheader };

// import { getState, isAdmin, subscribeDeep, webSiteName } from "../state/state.js";
// import { navigate } from "../routes/index.js";
// import { logout } from "../services/auth/authService.js";
// import { settingsSVG, moonSVG, profileSVG, shopBagSVG, logoutSVG, cardSVG } from "./svgs.js";
// import { createElement } from "../components/createElement.js";
// import { resolveImagePath, EntityType, PictureType } from "../utils/imagePaths.js";
// import Imagex from "./base/Imagex.js";
// import { sticky } from "./sticky.js";
// import Button from "./base/Button.js";

// const themes = ["light", "dark", "solarized", "dimmed"];
// let currentThemeIndex = 0;

// function loadTheme() {
//   const saved = localStorage.getItem("theme");
//   const index = themes.indexOf(saved);
//   if (index >= 0) {
//     document.documentElement.dataset.theme = saved;
//     currentThemeIndex = index;
//   }
// }

// function toggleTheme() {
//   currentThemeIndex = (currentThemeIndex + 1) % themes.length;
//   const theme = themes[currentThemeIndex];
//   document.documentElement.dataset.theme = theme;
//   localStorage.setItem("theme", theme);
// }

// function createIconButton(svg, href, onClick) {
//   const icon = createElement("span", { class: "icon" }, []);
//   icon.innerHTML = svg;

//   const anchor = createElement("div", { class: "iconic-button" }, [icon]);
//   if (href) anchor.href = href;
//   if (onClick) anchor.addEventListener("click", onClick);

//   return anchor;
// }

// function createDropdownMenu(id, labelText, items) {
//   const toggle = createElement("button", { id, class: "menu-toggle" }, [labelText]);
//   const menu = createElement("div", { class: "menu-content", "aria-label": labelText }, []);

//   items.forEach(({ href, text }) => {
//     const link = createElement("a", { class: "menu-item", href: `${text}` }, [text]);
//     link.addEventListener("click", (e) => {
//       e.preventDefault();
//       navigate(href);
//       menu.classList.toggle("open");
//     });
//     menu.append(link);
//   });

//   toggle.addEventListener("click", (e) => {
//     e.stopPropagation();
//     menu.classList.toggle("open");
//   });

//   return createElement("div", { class: "logoicon dropdown" }, [toggle, menu]);
// }

// export function createProfileSection(userId, username) {
//   const img = Imagex({
//     src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${userId}.jpg`),
//     alt: "Profile",
//     classes: "profile-pic"
//   });

//   const toggle = createElement("div", { class: "profile-toggle", tabIndex: 0 }, [img]);

//   const links = [
//     { href: "/profile", text: username, icon: profileSVG },
//     { href: "/my-orders", text: "My Orders", icon: shopBagSVG },
//     ...(isAdmin() ? [{ href: "/admin", text: "Admin" }] : []),
//     { href: "/wallet", text: "Wallet", icon: cardSVG },
//     { href: "/settings", text: "Settings", icon: settingsSVG }
//   ];

//   const menu = createElement("div", { class: "profile-menu" }, []);

//   links.forEach(({ href, text, icon }) => {
//     const label = createElement("span", {}, [text]);
//     const iconSpan = createElement("span", {}, []);
//     if (icon) iconSpan.innerHTML = icon;

//     const link = createElement("a", { class: "menu-item", href }, [iconSpan, label]);
//     link.addEventListener("click", (e) => {
//       e.preventDefault();
//       navigate(href);
//     });

//     menu.append(link);
//   });

//   const logoutBtn = createElement("button", { class: "menu-item logout" }, []);
//   logoutBtn.innerHTML = logoutSVG;
//   logoutBtn.append(createElement("span", {}, ["Logout"]));
//   logoutBtn.addEventListener("click", logout);
//   menu.append(logoutBtn);

//   toggle.addEventListener("click", (e) => {
//     e.stopPropagation();
//     menu.classList.toggle("open");
//   });

//   toggle.addEventListener("keydown", (e) => {
//     if (e.key === "Enter" || e.key === " ") {
//       e.preventDefault();
//       menu.classList.toggle("open");
//     }
//   });

//   document.addEventListener("click", () => menu.classList.remove("open"));

//   return createElement("div", { class: "dropdown" }, [toggle, menu]);
// }

// function renderUserSection() {
//   const container = createElement("div", { class: "user-area" }, []);

//   function update() {
//     container.replaceChildren();
//     const token = getState("token");
//     const userId = getState("user");
//     const username = getState("username");

//     if (token && userId) {
//       container.append(createProfileSection(userId, username));
//     } else {
//       // const loginBtn = createElement("a", { href: "#", class: "login-btn" }, ["Login"]);
//       // loginBtn.addEventListener("click", () => navigate("/login"));
//       // container.append(loginBtn);
//       const loginBtn = Button("Login", "login-button", {
//         click: () => {
//           navigate("/login");
//           localStorage.setItem("redirectAfterLogin", window.location.pathname);
//         }
//       }, "login-btn", { "border": "none", "cursor": "pointer" });
//       container.append(loginBtn);
//     }
//   }

//   subscribeDeep("token", update);
//   subscribeDeep("userProfile.role", update);

//   update();
//   return container;
// }

// function buildNav() {
//   const nav = createElement("div", { class: "header-content" }, []);

//   const token = getState("token");

//   if (token) {
//     const createLinks = [
//       { href: "/create-event", text: "Event" },
//       { href: "/create-place", text: "Place" },
//       { href: "/create-artist", text: "Artist" },
//       { href: "/create-post", text: "Post" },
//       { href: "/create-baito", text: "Baito" },
//       { href: "/create-farm", text: "Farm" },
//       { href: "/create-itinerary", text: "Itinerary" },
//       { href: "/create-recipe", text: "Recipe" }
//     ];
//     nav.append(createDropdownMenu("create-menu", "Create", createLinks));
//   }

//   nav.append(
//     createIconButton(moonSVG, null, toggleTheme),
//     renderUserSection()
//   );

//   return nav;
// }

// function enableNavAutoUpdate(navRef) {
//   function updateNav() {
//     const newNav = buildNav();
//     navRef.replaceWith(newNav);
//     navRef = newNav;
//   }

//   subscribeDeep("token", updateNav);
//   subscribeDeep("userProfile.role", updateNav);
// }

// function createHeader() {
//   const header = document.getElementById("pageheader");
//   if (!header || header.hasChildNodes()) return;

//   header.className = "main-header";

//   const logo = createElement("div", { class: "logo" }, [
//     createElement("a", { href: "/home", class: "logo-link" }, [webSiteName])
//   ]);

//   const sky = createElement("div", { class: "hflexcen" }, []);
//   sky.append(
//     sticky({
//       imglink: Imagex({
//         src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${getState("user")}.jpg`),
//         alt: "Profile",
//         classes: "profile-pic"
//       })
//     })
//   );

//   let nav = buildNav();
//   header.append(logo, sky, nav);

//   enableNavAutoUpdate(nav);

//   loadTheme();
// }

// export { createHeader as createheader };
