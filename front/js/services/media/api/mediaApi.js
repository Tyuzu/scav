import { apiFetch } from "../../../api/api.js";
import { FILEDROP_URL } from "../../../state/state.js";
import { UploadStore } from "../store/uploadStore.js";

/* -------------------------
   API
------------------------- */

export async function fetchMedia(entityType, entityId) {
  return await apiFetch(`/media/${entityType}/${entityId}`);
}

export async function deleteMedia(mediaId, entityType, entityId) {
  return await apiFetch(
    `/media/${entityType}/${entityId}/${mediaId}`,
    "DELETE"
  );
}

export async function postMedia(entityType, entityId, payload) {
  return await apiFetch(
    `/media/${entityType}/${entityId}`,
    "POST",
    payload,
    { json: true }
  );
}

/* -------------------------
   FileDrop Upload (single)
------------------------- */

export function uploadFile(u) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    UploadStore.controllers[u.id] = xhr;

    const formData = new FormData();
    formData.append(u.mediaEntity, u.file);
    formData.append("postType", u.fileType);

    UploadStore.update(u.id, { status: "uploading", progress: 0 });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        UploadStore.update(u.id, { progress: pct });
      }
    };

    xhr.onload = () => {
      delete UploadStore.controllers[u.id];

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          UploadStore.update(u.id, { status: "done", progress: 100 });

          resolve(Array.isArray(data) ? data[0] : data);
        } catch {
          UploadStore.update(u.id, { status: "error" });
          reject(new Error("Invalid FILEDROP response"));
        }
      } else {
        UploadStore.update(u.id, { status: "error" });
        reject(new Error(xhr.statusText));
      }
    };

    xhr.onerror = () => {
      UploadStore.update(u.id, { status: "error" });
      reject(new Error("Network error"));
    };

    xhr.onabort = () => {
      UploadStore.update(u.id, { status: "canceled" });
      reject(new Error("Upload canceled"));
    };

    xhr.open("POST", FILEDROP_URL);
    xhr.send(formData);
  });
}

/* -------------------------
   Concurrency Queue (core)
------------------------- */

async function runUploadQueue(items, worker, concurrency = 3) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    if (index >= items.length) {
      return;
    }

    const currentIndex = index++;
    const item = items[currentIndex];

    try {
      results[currentIndex] = await worker(item);
    } catch (err) {
      results[currentIndex] = { error: err.message || err };
    }

    return next(); // continue queue
  }

  const workers = Array.from({ length: concurrency }, () => next());

  await Promise.all(workers);

  return results;
}

/* -------------------------
   Retry Wrapper (optional)
------------------------- */

async function uploadWithRetry(item, retries = 2) {
  try {
    return await uploadFile(item);
  } catch (err) {
    if (retries > 0) {
      return uploadWithRetry(item, retries - 1);
    }
    throw err;
  }
}

/* -------------------------
   Public: Upload Multiple Files (LIMITED)
------------------------- */

export async function uploadFiles(files, options = {}) {
  const {
    mediaEntity = "images",
    fileType = "default",
    concurrency = 3,
    retry = 0,
  } = options;

  const items = Array.from(files).map((file) => {
    const id = crypto.randomUUID();

    // initialize store
    UploadStore.update(id, {
      fileName: file.name,
      progress: 0,
      status: "queued",
    });

    return {
      id,
      file,
      mediaEntity,
      fileType,
    };
  });

  const worker = retry > 0
    ? (item) => uploadWithRetry(item, retry)
    : (item) => uploadFile(item);

  return runUploadQueue(items, worker, concurrency);
}

/* -------------------------
   Cancel Helpers
------------------------- */

export function cancelUpload(id) {
  const xhr = UploadStore.controllers[id];
  if (xhr) {
    xhr.abort();
  }
}

export function cancelAllUploads() {
  Object.values(UploadStore.controllers).forEach((xhr) => xhr.abort());
}