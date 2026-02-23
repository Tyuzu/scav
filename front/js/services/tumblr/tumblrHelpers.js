// import { apiFetch } from "../../api/api";
import { createElement } from "../../components/createElement";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";

export function createEl(tag, attrs = {}, children = []) {
  if (attrs.class && typeof attrs.class === "string") {
    attrs.class = [attrs.class];
  }
  return createElement(tag, attrs, children);
}

export function createTabButton(label, onClick) {
  const btn = createEl("button", {
    class: ["tab-button"],
    role: "tab",
    // dataset: { tab: label },
    ariaSelected: "false"
  }, [label]);
  btn.addEventListener("click", onClick);
  return btn;
}

export function createPanel(id, children) {
  return createEl("div", { id, class: ["tab-panel"], role: "tabpanel", style: "display: none;" }, children);
}

export function createFileInput(type, multiple) {
  return createEl("input", {
    type: "file",
    class: ["file-input"],
    accept: `${type}/*`,
    multiple: multiple || undefined
  });
}

export function createPreviewContainer(id) {
  return createEl("div", { id, class: ["file-preview"] });
}

export function renderPreviewList(files, container, type, input, onChange) {
  container.innerHTML = "";
  const fileArr = Array.from(files);

  fileArr.forEach((file, index) => {
    if (!file.type.startsWith(type)) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      let mediaEl;
      if (type === "image") {
        mediaEl = createEl("img", { src, class: ["preview-image"] });
      } else if (type === "video") {
        mediaEl = createEl("video", { src, controls: true, class: ["preview-video"] });
      } else {
        mediaEl = createEl("audio", { src, controls: true, class: ["preview-audio"] });
      }

      const removeBtn = createEl("button", { class: ["remove-btn"] }, ["✖"]);
      removeBtn.addEventListener("click", () => {
        fileArr.splice(index, 1);
        const dt = new DataTransfer();
        fileArr.forEach(f => dt.items.add(f));
        input.files = dt.files;
        renderPreviewList(fileArr, container, type, input, onChange);
        if (onChange) onChange();
      });

      const wrapper = createEl("div", { class: ["preview-wrapper"] }, [mediaEl, removeBtn]);
      container.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

export async function getCSRFToken() {
  // const res = await apiFetch("/csrf");
  // return res?.csrf_token || "";
  return uuidv4();
}
