// uiHelpers.js
import { createElement } from "../../components/createElement.js";


// ------------------------ Utilities: content wrapper & loading overlay ------------------------
export function getContentContainer(container) {
    let content = container.querySelector(".music-content");
    if (!content) {
        content = createElement("div", { class: "music-content" });
        // keep content separate from toolbar/footer so we don't wipe them on refresh
        container.append(content);
    }
    return content;
}

export function showLoadingOverlay(content, text = "Loading...") {
    let overlay = content.querySelector(".music-loading-overlay");

    if (!overlay) {
        const textNode = createElement("div", { class: "music-loading-text" }, [text]);

        overlay = createElement(
            "div",
            {
                class: "music-loading-overlay",
                style: "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.8); z-index:9999;"
            },
            [textNode]
        );

        const parentStyle = window.getComputedStyle(content);
        if (parentStyle.position === "static") {
content.style.position = "relative";
}

        content.append(overlay);
    } else {
        const textEl = overlay.querySelector(".music-loading-text");
        if (textEl) {
            while (textEl.firstChild) {
textEl.removeChild(textEl.firstChild);
}
            textEl.append(document.createTextNode(text));
        }
        overlay.style.display = "";
    }
}


export function hideLoadingOverlay(content) {
    const overlay = content.querySelector(".music-loading-overlay");
    if (overlay) {
overlay.style.display = "none";
}
}


export function setButtonTextSafely(btn, text) {
    // avoid using textContent or innerHTML as per project rules: replace children with a text node
    while (btn.firstChild) {
btn.removeChild(btn.firstChild);
}
    btn.append(document.createTextNode(text));
}

export function createToolbarButton(text, onClick) {
    const btn = createElement("button", {}, [text]);
    btn.addEventListener("click", onClick);
    return btn;
}

export function createBackButton(container, onClick) {
    if (container.querySelector(".back-btn")) {
return;
}
    const backBtn = createElement("button", { class: "back-btn" }, ["⬅ Back"]);
    backBtn.addEventListener("click", onClick);
    container.prepend(backBtn);
}
