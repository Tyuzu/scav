import { apiFetch } from "../../api/api";
import { fetchFeed } from "../feed/fetchFeed.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import { renderNewPost } from "../feed/renderNewPost.js";
import {
  createEl,
  createTabButton,
  createPanel,
  createFileInput,
  createPreviewContainer,
  renderPreviewList,
  getCSRFToken
} from "./tumblrHelpers.js";
import { tposts_text, tposts_video, tposts_photo } from "../../components/tumblrSvgs.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import {
  appendIfValue,
  appendTags,
  clearChildren,
  uploadFilesInBatches,
  handleFileUpload
} from "./tumblrUploader.js";

const MEDIA_ENTITY = "feedpost";

/* =========================
   STATE
========================= */

const state = {
  activeTab: null,
  uploads: {
    text: null,
    image: [],
    video: null
  },
  uploading: {
    image: false,
    video: false
  },
  videoObjectUrl: null
};

const inputs = {};
const panels = {};
const previews = {};
const tabButtons = {};

const TAB_CONFIG = [
  {
    name: "Text",
    type: "text",
    icon: tposts_text,
    fields: [
      { label: "Text", type: "textarea", id: "text-input", placeholder: "Write something…", rows: 4 }
    ]
  },
  {
    name: "Images",
    type: "image",
    multiple: true,
    icon: tposts_photo,
    fields: [
      { label: "Caption", type: "textarea", id: "Images-caption", placeholder: "Add a caption…", rows: 2 },
      { label: "Tags", type: "text", id: "Images-tags", placeholder: "Tags (comma separated)" }
    ]
  },
  {
    name: "Video",
    type: "video",
    icon: tposts_video,
    fields: [
      { label: "Title", type: "text", id: "Video-title", placeholder: "Title" },
      { label: "Description", type: "textarea", id: "Video-description", placeholder: "Description", rows: 3 },
      { label: "Tags", type: "text", id: "Video-tags", placeholder: "Tags (comma separated)" }
    ]
  }
];

/* =========================
   MAIN
========================= */

export function displayTumblr(isLoggedIn, root) {
  root.replaceChildren();

  const layout = createEl("div", { class: ["tumblr-layout"] });
  const formCon = createEl("div", { class: ["tumblr-form"] });
  const tabHeader = createEl("div", { class: ["tab-header"], role: "tablist" });

  const publishBtn = createEl("button", {
    id: "publish-btn",
    class: ["publish-btn"],
    disabled: true,
    style: "display:none"
  }, ["Publish"]);

  publishBtn.addEventListener("click", handlePublish);

  /* =========================
     BUILD TABS
  ========================= */

  TAB_CONFIG.forEach(cfg => {
    const btn = createTabButton(
      createIconButton({ svgMarkup: cfg.icon }),
      () => switchTab(cfg)
    );
    tabButtons[cfg.name] = btn;
    tabHeader.append(btn);

    const container = createEl("div", { class: [`${cfg.type}-container`] });

    if (cfg.type !== "text") {
      const input = createFileInput(cfg.type, cfg.multiple);
      const preview = createPreviewContainer(`${cfg.type}-preview`);
      inputs[cfg.type] = input;
      previews[cfg.type] = preview;
      container.append(input, preview);

      if (cfg.type === "image") {
        wireImageUpload(input, preview);
      }
      if (cfg.type === "video") {
        wireVideoUpload(input, preview);
      }
    }

    cfg.fields.forEach(field => {
      const group = createFormGroup(field);
      const el = group.querySelector("input, textarea");
      inputs[field.id] = el;
      el.addEventListener("input", updatePublishState);
      container.append(group);
    });

    const panel = createPanel(`${cfg.type}-panel`, [container]);
    panel.style.display = "none";
    panels[cfg.name] = panel;
  });

  const panelWrapper = createEl("div", { class: ["panel-wrapper"] });
  Object.values(panels).forEach(p => panelWrapper.append(p));

  formCon.append(tabHeader, panelWrapper, publishBtn);
  layout.append(formCon);

  const feedContainer = createEl("div", { id: "postsContainer", class: ["tumblr-feed"] });
  layout.append(feedContainer);
  root.append(layout);

  refreshFeed(feedContainer);

  /* =========================
     STATE → UI
  ========================= */

  function switchTab(cfg) {
    state.activeTab = cfg;
    publishBtn.style.display = "inline-block";

    Object.entries(panels).forEach(([name, panel]) => {
      panel.style.display = name === cfg.name ? "block" : "none";
    });

    Object.entries(tabButtons).forEach(([name, btn]) => {
      btn.classList.toggle("active", name === cfg.name);
      btn.setAttribute("aria-selected", name === cfg.name);
    });

    updatePublishState();
  }

  function updatePublishState() {
    if (!state.activeTab) {
      publishBtn.disabled = true;
      return;
    }

    const { type } = state.activeTab;

    if (state.uploading[type]) {
      publishBtn.disabled = true;
      return;
    }

    if (type === "text") {
      publishBtn.disabled = !inputs["text-input"].value.trim();
    }

    if (type === "image") {
      publishBtn.disabled = !state.uploads.image.length;
    }

    if (type === "video") {
      publishBtn.disabled = !(
        state.uploads.video &&
        inputs["Video-title"].value.trim()
      );
    }
  }

  /* =========================
     UPLOAD WIRES
  ========================= */

  function wireImageUpload(input, preview) {
    input.addEventListener("change", async () => {
      const files = Array.from(input.files);
      if (!files.length) {
        return;
      }

      state.uploading.image = true;
      updatePublishState();

      clearChildren(preview);
      renderPreviewList(files, preview, "image", input, updatePublishState);

      try {
        state.uploads.image = await uploadFilesInBatches(
          files,
          MEDIA_ENTITY,
          preview,
          3,
          "image"
        );
      } finally {
        state.uploading.image = false;
        updatePublishState();
      }
    });
  }

  function wireVideoUpload(input, preview) {
    const videoEl = createEl("video", { controls: true, class: ["preview-video"] });
    preview.append(videoEl);

    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) {
        return;
      }

      if (state.videoObjectUrl) {
        URL.revokeObjectURL(state.videoObjectUrl);
      }

      state.videoObjectUrl = URL.createObjectURL(file);
      videoEl.src = state.videoObjectUrl;

      state.uploading.video = true;
      updatePublishState();

      try {
        state.uploads.video = await handleFileUpload(file, MEDIA_ENTITY, "video");
      } finally {
        state.uploading.video = false;
        updatePublishState();
      }
    });
  }

  /* =========================
     PUBLISH
  ========================= */

  async function handlePublish() {
    publishBtn.disabled = true;
    try {
      const payload = buildPayload();
      const csrfToken = await getCSRFToken();

      const res = await apiFetch("/feed/post", "POST", payload, {
        headers: { "X-CSRF-Token": csrfToken }
      });

      renderNewPost([res.data], 1, feedContainer);
      resetState();
    } catch {
      alert("Failed to publish post.");
    } finally {
      updatePublishState();
    }
  }

  function buildPayload() {
    const { type } = state.activeTab;
    const obj = { type };

    if (type === "text") {
      appendIfValue(obj, "text", inputs["text-input"]);
    }

    if (type === "image") {
      obj.images = state.uploads.image;
      appendIfValue(obj, "caption", inputs["Images-caption"]);
      appendTags(obj, inputs["Images-tags"]);
    }

    if (type === "video") {
      obj.video = state.uploads.video;
      appendIfValue(obj, "title", inputs["Video-title"]);
      appendIfValue(obj, "description", inputs["Video-description"]);
      appendTags(obj, inputs["Video-tags"]);
    }

    return obj;
  }

  function resetState() {
    Object.values(inputs).forEach(i => i && (i.value = ""));
    Object.values(previews).forEach(p => clearChildren(p));

    state.activeTab = null;
    state.uploads.image = [];
    state.uploads.video = null;
    state.uploading.image = false;
    state.uploading.video = false;

    if (state.videoObjectUrl) {
      URL.revokeObjectURL(state.videoObjectUrl);
      state.videoObjectUrl = null;
    }

    publishBtn.style.display = "none";
  }

  async function refreshFeed(container) {
    try {
      await fetchFeed(container);
    } catch {
      alert("Failed to load feed.");
    }
  }
}
