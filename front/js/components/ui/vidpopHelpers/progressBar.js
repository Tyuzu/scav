import { createElement } from "../../createElement";

export function createProgressBar() {
  const bar = createElement("div", { class: "progress-bar" }, []);
  const progress = createElement("div", { class: "progress" }, []);
  bar.appendChild(progress);
  return { bar, progress };
}
