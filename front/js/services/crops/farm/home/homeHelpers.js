// YoHome.js
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { login, signup } from "../auth/authService.js";
import { advertEmbed } from "../../../ads/adspace.js";

// --- helpers ---
export const formatDate = () => {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function createWeatherInfoWidget() {
  return createElement("section", { class: "info-widget" }, [
    createElement("div", { class: "weather" }, ["🌤️ 28.6°C"]),
    createElement("div", { class: "location" }, ["NYC"]),
    createElement("div", { class: "date" }, [formatDate()]),
  ]);
}

export function createSearchBar() {
  return createElement("section", { class: "search-bar" }, [
    createElement("input", {
      class: "search-input",
      type: "text",
      placeholder: "Search places, events, artists...",
      "aria-label": "Search",
      name: "search",
    }),
  ]);
}

// helper for input fields
export function inputField(id, type, placeholder) {
  return createElement("input", { id, type, placeholder });
}

// --- NAV WRAPPER ---
export function createNavWrapper() {
  const navItems = [
    ["📍", "Places", "/places"],
    ["🌾", "Grocery", "/grocery"],
    ["🎫", "Events", "/events"],
    ["💼", "Baito", "/baitos"],
    ["🧑‍💼", "Hire", "/baitos/hire"],
    ["📢", "Social", "/social"],
    ["📝", "Posts", "/posts"],
    ["🛍️", "Shop", "/products"],
    ["🍳", "Recipes", "/recipes"],
    ["🧭", "Itinerary", "/itinerary"],
    ["🎨", "Artists", "/artists"],
  ];

  const maxVisible = 6;
  const collapsedGrid = createElement("div", { class: "nav-grid" });
  const expandedGrid = createElement("div", {
    class: "nav-grid",
    style: "display:none;",
    id: "expanded-nav",
  });

  const createNavIcon = (emoji, label, href) => {
    const icon = createElement(
      "div",
      { class: "nav-icon", role: "button", tabindex: "0" },
      [createElement("span", {}, [emoji]), createElement("span", {}, [label])]
    );
    icon.addEventListener("click", () => navigate(href));
    return icon;
  };

  navItems.forEach(([emoji, label, href], index) => {
    const icon = createNavIcon(emoji, label, href);
    (index < maxVisible ? collapsedGrid : expandedGrid).appendChild(icon);
  });

  const savedExpanded = localStorage.getItem("navExpanded") === "true";
  let isExpanded = savedExpanded;
  expandedGrid.style.display = isExpanded ? "flex" : "none";

  const toggleNav = createElement(
    "div",
    { class: "toggle-nav", role: "button", "aria-expanded": String(isExpanded), tabindex: "0" },
    [isExpanded ? "Less" : "More"]
  );

  toggleNav.addEventListener("click", () => {
    isExpanded = !isExpanded;
    expandedGrid.style.display = isExpanded ? "flex" : "none";
    toggleNav.textContent = isExpanded ? "Less" : "More";
    toggleNav.setAttribute("aria-expanded", String(isExpanded));
    localStorage.setItem("navExpanded", isExpanded);
  });

  return createElement("section", { class: "navbox", role: "navigation" }, [
    collapsedGrid,
    expandedGrid,
    toggleNav,
  ]);
}

// --- AUTH FORMS ---
export function createAuthForms() {
  const loginForm = createElement("form", { id: "login-form", class: "create-section" }, [
    createElement("h3", {}, ["Login"]),
    inputField("login-username", "text", "Username"),
    inputField("login-password", "password", "Password"),
    createElement("button", { type: "submit" }, ["Login"]),
  ]);
  loginForm.addEventListener("submit", login);

  const signupForm = createElement("form", { id: "signup-form", class: "create-section" }, [
    createElement("h3", {}, ["Signup"]),
    inputField("signup-username", "text", "Username"),
    inputField("signup-email", "email", "Email"),
    inputField("signup-password", "password", "Password"),
    createElement("button", { type: "submit" }, ["Signup"]),
  ]);
  signupForm.addEventListener("submit", signup);

  return createElement("div", { class: "auth-forms" }, [loginForm, signupForm]);
}

// --- AD SPACE ---
export function adspace(position = "") {
  return createElement("section", { class: `advert advert-${position}` }, [advertEmbed("home", position)]);
}
