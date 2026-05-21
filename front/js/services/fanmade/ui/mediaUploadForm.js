import Modal from "../../../components/ui/Modal.mjs";
import { Button } from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";
import Notify from "../../../components/ui/Notify.mjs";
import Imagex from "../../../components/base/Imagex.js";

import { UploadStore } from "../store/uploadStore.js";

import {
  uploadFile,
  postMedia
} from "../api/mediaApi.js";

import {
  detectCaptionLang
} from "../../media/mediaCommon.js";

// ---------------------------------
// UID
// ---------------------------------

export function uid() {

  return crypto.randomUUID?.()
    || Math.random()
      .toString(36)
      .substring(2, 9);
}

// ---------------------------------
// FILE TYPE
// ---------------------------------

function getFileType(file) {

  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "unknown";
}

// ---------------------------------
// FILE EXTENSION
// ---------------------------------

function getFileExtension(file) {

  const name = file.name;

  const lastDot = name.lastIndexOf(".");

  return lastDot !== -1
    ? name.substring(lastDot)
    : "";
}

// ---------------------------------
// MAIN MODAL
// ---------------------------------

export function showMediaUploadForm(
  isLoggedIn,
  entityType,
  entityId,
  _mediaList
) {

  const uploadsDiv = createElement(
    "div",
    {
      class: "upload-list"
    }
  );

  const caption = createElement(
    "textarea",
    {
      placeholder: "Write a caption...",
      class: "upload-caption",
    }
  );

  const fileInputId =
    `mediaFileInput-${uid()}`;

  const fileInput = createElement(
    "input",
    {
      type: "file",

      multiple: true,

      accept: "image/*,video/*",

      class: "hidden",

      id: fileInputId,
    }
  );

  // ---------------------------------
  // DROPZONE
  // ---------------------------------

  const dropZone = createElement(
    "div",
    {
      class: "upload-dropzone"
    },
    [
      createElement(
        "label",
        {
          for: fileInputId,
          class: "upload-label"
        },
        [
          "Select or drop files here"
        ]
      ),

      fileInput
    ]
  );

  // ---------------------------------
  // SUBMIT
  // ---------------------------------

  const submit = Button(
    "Upload All",

    "submitUploadsBtn",

    {
      click: () => submitGroupedUploads(
        caption,
        uploadsDiv,
        entityType,
        entityId,
        modal
      )
    },

    "button-primary"
  );

  submit.style.display = "none";

  // ---------------------------------
  // CONTENT
  // ---------------------------------

  const content = createElement(
    "div",
    {
      class: "upload-container"
    },
    [
      dropZone,
      caption,
      uploadsDiv,
      submit
    ]
  );

  const modal = Modal({

    title: "Upload Media",

    content,

    onClose: () => {

      // cleanup blob URLs

      UploadStore.uploads.forEach((u) => {

        if (u.previewURL) {

          URL.revokeObjectURL(
            u.previewURL
          );
        }
      });

      UploadStore.clear();
    },

    size: "large"
  });

  // ---------------------------------
  // DRAG + DROP
  // ---------------------------------

  const handleDrop = (e) => {

    e.preventDefault();

    dropZone.classList.remove(
      "drag-active"
    );

    const files = Array.from(
      e.dataTransfer.files
    );

    handleFiles(
      files,
      caption,
      uploadsDiv,
      submit,
      entityType,
      entityId
    );
  };

  dropZone.addEventListener(
    "dragover",
    (e) => {

      e.preventDefault();

      dropZone.classList.add(
        "drag-active"
      );
    }
  );

  dropZone.addEventListener(
    "dragleave",
    (e) => {

      e.preventDefault();

      dropZone.classList.remove(
        "drag-active"
      );
    }
  );

  dropZone.addEventListener(
    "drop",
    handleDrop
  );

  // ---------------------------------
  // FILE INPUT
  // ---------------------------------

  fileInput.addEventListener(
    "change",
    (e) => handleFiles(
      Array.from(e.target.files),
      caption,
      uploadsDiv,
      submit,
      entityType,
      entityId
    )
  );
}

// ---------------------------------
// VALIDATION
// ---------------------------------

function validateFile(file) {

  const MAX_SIZE_MB = 100;

  const validTypes = [
    "image/",
    "video/"
  ];

  if (
    !validTypes.some((t) =>
      file.type.startsWith(t)
    )
  ) {

    throw new Error(
      `${file.name}: Unsupported file type`
    );
  }

  if (
    file.size >
    MAX_SIZE_MB * 1024 * 1024
  ) {

    throw new Error(
      `${file.name}: File too large`
    );
  }
}

// ---------------------------------
// HANDLE FILES
// ---------------------------------

function handleFiles(
  files,
  caption,
  uploadsDiv,
  submit,
  entityType,
  entityId
) {

  try {

    files.forEach(validateFile);

  } catch (err) {

    return Notify(
      err.message,
      {
        type: "error"
      }
    );
  }

  const newUploads = files.map((f) => ({

    id: uid(),

    file: f,

    previewURL:
      URL.createObjectURL(f),

    progress: 0,

    uploading: true,

    done: false,

    error: false,

    fileType: getFileType(f),

    extension:
      getFileExtension(f),

    // backend-aligned fields
    entityType,
    entityId
  }));

  UploadStore.uploads.push(
    ...newUploads
  );

  renderUploads(
    uploadsDiv,
    submit
  );

  newUploads.forEach((u) =>
    uploadFileAndTrack(
      u,
      uploadsDiv,
      submit
    )
  );
}

// ---------------------------------
// UPLOAD TRACKER
// ---------------------------------

async function uploadFileAndTrack(
  u,
  uploadsDiv,
  submit
) {

  try {

    const dropData =
      await uploadFile({

        id: u.id,

        file: u.file,

        entityType: u.entityType,

        entityId: String(
          u.entityId || ""
        )
      });

    UploadStore.update(
      u.id,
      {
        uploading: false,

        done: true,

        dropData,

        progress: 100
      }
    );

    Notify(
      `Uploaded: ${u.file.name}`,
      {
        type: "success"
      }
    );

  } catch (err) {

    UploadStore.update(
      u.id,
      {
        uploading: false,
        error: true
      }
    );

    Notify(
      err.message || "Upload failed",
      {
        type: "error"
      }
    );

  } finally {

    renderUploads(
      uploadsDiv,
      submit
    );
  }
}

// ---------------------------------
// SUBMIT GROUP
// ---------------------------------

async function submitGroupedUploads(
  caption,
  uploadsDiv,
  entityType,
  entityId,
  modal
) {

  const ready =
    UploadStore.uploads.filter(
      (u) =>
        u.dropData &&
        !u.serverData
    );

  if (!ready.length) {

    return Notify(
      "No uploads ready to submit.",
      {
        type: "info"
      }
    );
  }

  const captionLang =
    detectCaptionLang(
      caption.value
    );

  const payload = {

    caption: caption.value,

    captionLang,

    files: ready.map((u) => ({

      filename:
        u.dropData.filename
        || u.dropData.key,

      extn:
        u.dropData.extension
        || u.extension
    }))
  };

  try {

    const res = await postMedia(
      entityType,
      entityId,
      payload
    );

    if (Array.isArray(res)) {

      ready.forEach((u, i) => {

        UploadStore.update(
          u.id,
          {
            serverData: res[i]
          }
        );
      });

      Notify(
        "Media submitted successfully!",
        {
          type: "success",
          dismissible: true
        }
      );

      modal.close?.();
    }

  } catch (err) {

    Notify(
      err.message
      || "Failed to submit media",
      {
        type: "error"
      }
    );
  }
}

// ---------------------------------
// RENDER UPLOADS
// ---------------------------------

function renderUploads(
  uploadsDiv,
  submit
) {

  const fragment =
    document.createDocumentFragment();

  // cleanup removed uploads

  const currentIds =
    new Set(
      UploadStore.uploads.map(
        (u) => u.id
      )
    );

  uploadsDiv
    .querySelectorAll(".upload-card")
    .forEach((el) => {

      if (
        !currentIds.has(
          el.dataset.id
        )
      ) {

        el.remove();
      }
    });

  UploadStore.uploads.forEach((u) => {

    const existing =
      uploadsDiv.querySelector(
        `[data-id="${u.id}"]`
      );

    // ---------------------------------
    // UPDATE EXISTING
    // ---------------------------------

    if (existing) {

      const bar =
        existing.querySelector(
          ".upload-progress > div"
        );

      if (bar) {

        bar.style.width =
          `${u.progress || 0}%`;
      }

      existing.classList.toggle(
        "upload-error",
        !!u.error
      );

      existing.classList.toggle(
        "upload-done",
        !!u.done
      );

      return;
    }

    // ---------------------------------
    // PREVIEW
    // ---------------------------------

    const preview =
      u.fileType === "image"

        ? Imagex({
          src: u.previewURL,
          class: "upload-preview"
        })

        : createElement(
          "video",
          {
            src: u.previewURL,
            controls: true,
            class: "upload-preview",
          }
        );

    // ---------------------------------
    // PROGRESS
    // ---------------------------------

    const progress = createElement(
      "div",
      {
        class: "upload-progress"
      },
      [
        createElement(
          "div",
          {
            class:
              "upload-progress-bar",

            style:
              `width:${u.progress}%`
          }
        )
      ]
    );

    // ---------------------------------
    // REMOVE
    // ---------------------------------

    const removeBtn = Button(
      "Remove",

      "",

      {
        click: () => {

          if (u.previewURL) {

            URL.revokeObjectURL(
              u.previewURL
            );
          }

          UploadStore.remove(
            u.id
          );

          renderUploads(
            uploadsDiv,
            submit
          );
        }
      },

      "button-secondary"
    );

    // ---------------------------------
    // CARD
    // ---------------------------------

    const card = createElement(
      "div",
      {
        class: "upload-card",
        "data-id": u.id
      },
      [
        preview,

        createElement(
          "p",
          {},
          [
            u.file.name
          ]
        ),

        progress,

        removeBtn
      ]
    );

    fragment.append(card);
  });

  uploadsDiv.append(fragment);

  // ---------------------------------
  // SUBMIT VISIBILITY
  // ---------------------------------

  submit.style.display =
    UploadStore.uploads.some(
      (u) =>
        u.dropData &&
        !u.serverData
    )
      ? "inline-block"
      : "none";
}