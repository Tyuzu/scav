import { setLanguage } from "../i18n/i18n.js";
import { navigate } from "../routes/index.js";
import { webSiteName } from "../state/state.js";
import Button from "./base/Button.js";
import { userFeedbackGlobal } from "../services/reporting/feedback.js";
import { createElement } from "../components/createElement.js";

const handleNavigation = (event, href) => {
    event.preventDefault();
    if (!href) {
return console.error("handleNavigation received null href");
}
    navigate(href);
};

const Footer = () => {
    const pages = [
        { href: "/about", label: "About Us" },
        { href: "/contact", label: "Contact Us" },
        { href: "/faq", label: "FAQ" },
        { href: "/terms", label: "Terms & Conditions" },
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/refund", label: "Refund Policy" },
        { href: "/shipping", label: "Shipping Policy" },
        { href: "/returns", label: "Return Policy" },
        { href: "/disclaimer", label: "Disclaimer" },
        { href: "/blog", label: "Blog" }
    ];

    const navLinks = pages.map(({ href, label }) => {
        return createElement("a", {
            href,
            class: "footer-link",
            onclick: (e) => handleNavigation(e, href),
        }, [label]);
    });

    const nav = createElement("nav", { class: "footer-nav" }, navLinks);

    const langSelect = createElement("select", {
        name: "lang-select",
        class: "lang-select",
        "aria-label": "Select Page Language",
        onchange: async (e) => {
            const lang = e.target.value;
            if (lang) {
await setLanguage(lang);
}
        }
    }, [
        createElement("option", { value: "en" }, ["English"]),
        createElement("option", { value: "fr" }, ["Français"]),
        createElement("option", { value: "es" }, ["Español"]),
        createElement("option", { value: "hi" }, ["हिन्दी"])
    ]);

    const savedLang = localStorage.getItem("lang") || "en";
    langSelect.value = savedLang;

    const feedbackButton = Button("Feedback", "feedback-btn", {
        click: () => userFeedbackGlobal()
    }, "buttonx", {});

    const footerBottom = createElement("div", { class: "footer-bottom" }, [
        langSelect,
        createElement("p", {}, [
            `© ${new Date().getFullYear()} ${webSiteName}. All rights reserved.`
        ]),
        feedbackButton
    ]);

    return createElement("div", { class: "footer-container" }, [
        nav,
        footerBottom
    ]);
};

export { Footer };
