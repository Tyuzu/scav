import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

/* ------------------------------------------------------
   TRANSLATION HELPERS
------------------------------------------------------ */
export async function translateText(text) {
  await new Promise(r => setTimeout(r, 300)); // simulate delay
  return `[Translated] ${text}`;
}

export async function handleTranslationToggle(toggle, originalText, container) {
  const showing = toggle.dataset.state === "translated";

  if (showing) {
    container.style.display = "none";
    toggle.dataset.state = "original";
    toggle.firstChild.nodeValue = "See Translation";
    return;
  }

  if (!container.firstChild) {
    toggle.firstChild.nodeValue = "Translating...";
    try {
      const translated = await translateText(originalText);
      container.append(createElement("p", { class: "translated-text" }, [translated]));
    } catch {
      Notify("Translation failed", { type: "error" });
    }
  }

  container.style.display = "block";
  toggle.dataset.state = "translated";
  toggle.firstChild.nodeValue = "Hide Translation";
}
