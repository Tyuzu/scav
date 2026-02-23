import Modal from "../../../components/ui/Modal.mjs";
import { Button } from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";
import Notify from "../../../components/ui/Notify.mjs";
import Imagex from "../../../components/base/Imagex.js";
import { UploadStore } from "../store/uploadStore.js";
import { uploadFile, postMedia } from "../api/mediaApi.js";

// --- Helper for unique IDs ---
export function uid() {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);
}

// --- Helper to determine file type ---
function getFileType(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "unknown";
}

// --- Main function ---
export function showMediaUploadForm(isLoggedIn, entityType, entityId, mediaList) {
  const uploadsDiv = createElement("div", { class: "upload-list" });
  const caption = createElement("textarea", {
    placeholder: "Write a caption...",
    class: "upload-caption",
  });

  const fileInputId = `mediaFileInput-${uid()}`;
  const fileInput = createElement("input", {
    type: "file",
    multiple: true,
    accept: "image/*,video/*",
    class: "hidden",
    id: fileInputId,
  });

  // Label styled as a button
  const dropZone = createElement("div", { class: "upload-dropzone" }, [
    createElement("label", { for: fileInputId, class: "upload-label" }, [
      "Select or drop files here",
    ]),
    fileInput,
  ]);

  const submit = Button(
    "Upload All",
    "submitUploadsBtn",
    {
      click: () =>
        submitGroupedUploads(caption, uploadsDiv, entityType, entityId, modal),
    },
    "button-primary"
  );
  submit.style.display = "none";

  const content = createElement("div", { class: "upload-container" }, [
    dropZone,
    caption,
    uploadsDiv,
    submit,
  ]);

  const modal = Modal({
    title: "Upload Media",
    content,
    onClose: () => {
      // Cleanup URLs to prevent blob leaks
      UploadStore.uploads.forEach((u) => {
        if (u.previewURL) URL.revokeObjectURL(u.previewURL);
      });
      UploadStore.clear();
    },
    size: "large",
  });

  // --- Drag & Drop ---
  const handleDrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files, caption, uploadsDiv, submit);
  };

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
  });
  dropZone.addEventListener("drop", handleDrop);

  // File selection via input
  fileInput.addEventListener("change", (e) =>
    handleFiles(Array.from(e.target.files), caption, uploadsDiv, submit)
  );
}

// --- Validate files ---
function validateFile(file) {
  const MAX_SIZE_MB = 100;
  const validTypes = ["image/", "video/"];
  if (!validTypes.some((t) => file.type.startsWith(t)))
    throw new Error(`${file.name}: Unsupported file type`);
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    throw new Error(`${file.name}: File too large`);
}

// --- Handle files ---
function handleFiles(files, caption, uploadsDiv, submit) {
  try {
    files.forEach(validateFile);
  } catch (err) {
    return Notify(err.message, { type: "error" });
  }

  const newUploads = files.map((f) => ({
    id: uid(),
    file: f,
    previewURL: URL.createObjectURL(f),
    progress: 0,
    uploading: true,
    fileType: getFileType(f),
    mediaEntity: "media",
  }));

  UploadStore.uploads.push(...newUploads);
  renderUploads(uploadsDiv, submit);

  newUploads.forEach((u) => uploadFileAndTrack(u, uploadsDiv, submit));
}

// --- Upload helper ---
async function uploadFileAndTrack(u, uploadsDiv, submit) {
  try {
    const dropData = await uploadFile(u);
    UploadStore.update(u.id, {
      uploading: false,
      done: true,
      dropData,
      progress: 100,
    });
    Notify(`Uploaded: ${u.file.name}`, { type: "success" });
  } catch (err) {
    UploadStore.update(u.id, { uploading: false, error: true });
    Notify(err.message || "Upload failed", { type: "error" });
  } finally {
    // Keep preview visible until user closes modal or removes manually
    renderUploads(uploadsDiv, submit);
  }
}

// --- Submit grouped uploads ---
async function submitGroupedUploads(caption, uploadsDiv, entityType, entityId, modal) {
  const ready = UploadStore.uploads.filter((u) => u.dropData && !u.serverData);
  if (!ready.length)
    return Notify("No uploads ready to submit.", { type: "info" });

  // const payload = { caption: caption.value, files: ready.map((u) => u.dropData) };
  const payload = {
    caption: caption.value,
    captionLang: detectCaptionLang(caption.value),
    files: ready.map((u) => u.dropData)
  };
  
  try {
    const res = await postMedia(entityType, entityId, payload);
    if (Array.isArray(res)) {
      ready.forEach((u, i) =>
        UploadStore.update(u.id, { serverData: res[i] })
      );
      Notify("Media submitted successfully!", { type: "success", dismissible:true });
      modal.close?.();
    }
  } catch (err) {
    Notify(err.message || "Failed to submit media", { type: "error" });
  }
}

// --- Render uploads incrementally ---
function renderUploads(uploadsDiv, submit) {
  const fragment = document.createDocumentFragment();

  // Remove orphaned DOM nodes
  const currentIds = new Set(UploadStore.uploads.map((u) => u.id));
  uploadsDiv.querySelectorAll(".upload-card").forEach((el) => {
    if (!currentIds.has(el.dataset.id)) el.remove();
  });

  UploadStore.uploads.forEach((u) => {
    const existing = uploadsDiv.querySelector(`[data-id="${u.id}"]`);
    if (existing) {
      const bar = existing.querySelector(".upload-progress > div");
      if (bar) bar.style.width = `${u.progress || 0}%`;
      existing.classList.toggle("upload-error", !!u.error);
      existing.classList.toggle("upload-done", !!u.done);
      return;
    }

    const preview =
      u.fileType === "image"
        ? Imagex({ src: u.previewURL, class: "upload-preview" })
        : createElement("video", {
            src: u.previewURL,
            controls: true,
            class: "upload-preview",
          });

    const progress = createElement("div", { class: "upload-progress" }, [
      createElement("div", {
        class: "upload-progress-bar",
        style: `width:${u.progress}%`,
      }),
    ]);

    const removeBtn = Button(
      "Remove",
      "",
      {
        click: () => {
          if (u.previewURL) URL.revokeObjectURL(u.previewURL);
          UploadStore.remove(u.id);
          renderUploads(uploadsDiv, submit);
        },
      },
      "button-secondary"
    );

    const card = createElement("div", { class: "upload-card", "data-id": u.id }, [
      preview,
      createElement("p", {}, [u.file.name]),
      progress,
      removeBtn
    ]);

    fragment.append(card);
  });

  uploadsDiv.append(fragment);

  submit.style.display = UploadStore.uploads.some(
    (u) => u.dropData && !u.serverData
  )
    ? "inline-block"
    : "none";
}

function detectCaptionLang(text) {
  const s = text.trim();
  if (!s) return "unknown";

  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0x4E00 && code <= 0x9FFF) return "zh"; // Chinese
    if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) return "ja"; // Japanese
    if (code >= 0xAC00 && code <= 0xD7AF) return "ko"; // Korean
  }
  return "en";
}
