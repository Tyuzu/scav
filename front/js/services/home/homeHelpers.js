import { getState, subscribeDeep } from "../../state/state.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { login, signup } from "../auth/authService.js";
import { advertEmbed } from "../ads/adspace.js";

/* ---------------------------------- */
/* Utils */
/* ---------------------------------- */

export const formatDate = (date = new Date()) =>
    date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

const safeGetLocal = (key, fallback = false) => {
    try {
        const val = localStorage.getItem(key);
        return val === null ? fallback : val === "true";
    } catch {
        return fallback;
    }
};

const safeSetLocal = (key, value) => {
    try {
        localStorage.setItem(key, String(value));
    } catch {}
};

/* ---------------------------------- */
/* Weather Widget */
/* ---------------------------------- */

export function createWeatherInfoWidget({
    temperature = "28.6°C",
    location = "NYC",
    icon = "🌤️"
} = {}) {
    return createElement("section", { class: "info-widget" }, [
        createElement("div", { class: "weather" }, [`${icon} ${temperature}`]),
        createElement("div", { class: "location" }, [location]),
        createElement("div", { class: "date" }, [formatDate()])
    ]);
}

/* ---------------------------------- */
/* Search */
/* ---------------------------------- */

export function createSearchBar() {
    return createElement("section", { class: "search-bar" }, [
        createElement("input", {
            class: "search-input",
            type: "search",
            placeholder: "Search places, events, artists...",
            "aria-label": "Search",
            name: "search",
            autocomplete: "off"
        })
    ]);
}

export function inputField({
    type = "text",
    id,
    placeholder,
    autocomplete,
    required = true
}) {
    return createElement("input", {
        type,
        id,
        placeholder,
        required,
        ...(autocomplete && { autocomplete })
    });
}

/* ---------------------------------- */
/* Navigation */
/* ---------------------------------- */

export function createNavWrapper() {
    const NAV_ITEMS = [
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
        ["🎨", "Artists", "/artists"]
    ];

    const MAX_VISIBLE = 6;

    const createNavIcon = ([emoji, label, href]) => {
        const el = createElement(
            "div",
            {
                class: "nav-icon",
                role: "button",
                tabindex: "0",
                "aria-label": label
            },
            [
                createElement("span", {}, [emoji]),
                createElement("span", {}, [label])
            ]
        );

        const activate = () => navigate(href);

        el.addEventListener("click", activate);
        el.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
              activate();
            }
        });

        return el;
    };

    const collapsedGrid = createElement("div", { class: "nav-grid" });
    const expandedGrid = createElement("div", { class: "nav-grid expanded-nav" });

    NAV_ITEMS.forEach((item, i) => {
        const icon = createNavIcon(item);
        (i < MAX_VISIBLE ? collapsedGrid : expandedGrid).appendChild(icon);
    });

    let isExpanded = safeGetLocal("navExpanded", false);
    expandedGrid.classList.toggle("is-visible", isExpanded);

    const toggleBtn = createElement(
        "button",
        {
            class: "toggle-nav",
            "aria-expanded": String(isExpanded),
            type: "button"
        },
        [isExpanded ? "Less" : "More"]
    );

    toggleBtn.addEventListener("click", () => {
        isExpanded = !isExpanded;
        expandedGrid.classList.toggle("is-visible", isExpanded);
        toggleBtn.textContent = isExpanded ? "Less" : "More";
        toggleBtn.setAttribute("aria-expanded", String(isExpanded));
        safeSetLocal("navExpanded", isExpanded);
    });

    return createElement("section", { class: "navbox", role: "navigation" }, [
        collapsedGrid,
        expandedGrid,
        toggleBtn
    ]);
}

/* ---------------------------------- */
/* Auth Forms (Optimized Rendering) */
/* ---------------------------------- */

export function createAuthForms() {
    const wrapper = createElement("div", { class: "auth-forms-wrapper" });

    const buildForm = ({ id, title, fields, handler }) => {
        const form = createElement(
            "form",
            { id, class: "create-section auth-form" },
            [
                createElement("h3", {}, [title]),
                ...fields,
                createElement("button", { type: "submit" }, [title])
            ]
        );

        form.addEventListener("submit", handler);
        return form;
    };

    const renderLoggedIn = (username) =>
        createElement("div", { class: "logged-info" }, [
            "You are logged in as ",
            username || "user"
        ]);

    const renderForms = () =>
        createElement("div", { class: "auth-forms" }, [
            buildForm({
                id: "login-form",
                title: "Login",
                handler: login,
                fields: [
                    inputField({
                        type: "text",
                        id: "login-username",
                        placeholder: "Username",
                        autocomplete: "username"
                    }),
                    inputField({
                        type: "password",
                        id: "login-password",
                        placeholder: "Password",
                        autocomplete: "current-password"
                    })
                ]
            }),
            buildForm({
                id: "signup-form",
                title: "Signup",
                handler: signup,
                fields: [
                    inputField({
                        type: "text",
                        id: "signup-username",
                        placeholder: "Username",
                        autocomplete: "username"
                    }),
                    inputField({
                        type: "email",
                        id: "signup-email",
                        placeholder: "Email",
                        autocomplete: "email"
                    }),
                    inputField({
                        type: "password",
                        id: "signup-password",
                        placeholder: "Password",
                        autocomplete: "new-password"
                    })
                ]
            })
        ]);

    function render() {
        const token = getState("token");
        const username = getState("username");

        wrapper.replaceChildren(
            token ? renderLoggedIn(username) : renderForms()
        );
    }

    // Only subscribe once
    subscribeDeep("token", render);

    render();
    return wrapper;
}

/* ---------------------------------- */
/* Ad Space */
/* ---------------------------------- */

export function adspace(position = "") {
    return createElement("section", { class: `advert advert-${position}` }, [
        advertEmbed("home", position)
    ]);
}