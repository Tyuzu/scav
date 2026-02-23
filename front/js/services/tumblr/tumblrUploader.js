import { uploadFile } from "../media/api/mediaApi.js";
import { createEl } from "./tumblrHelpers.js";

export function appendIfValue(obj, key, el) {
  const val = el?.value.trim();
  if (val) obj[key] = val;
}

export function appendTags(obj, el) {
  const tags = el?.value.split(",").map(t => t.trim()).filter(Boolean);
  if (tags.length) obj.tags = tags;
}

export function clearChildren(el) {
  el.replaceChildren();
}

export async function uploadFilesInBatches(files, mediaEntity, previewContainer, maxConcurrent = 3, fileType = "image") {
  const results = [];
  const queue = [...files];
  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      const progressEl = createEl("div", { class: ["upload-progress"] }, [`Uploading: ${file.name}`]);
      previewContainer.appendChild(progressEl);
      try {
        const uploaded = await handleFileUpload(file, mediaEntity, fileType);
        const data = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        progressEl.textContent = `✔ ${file.name} uploaded`;
        results.push({ filename: data.filename, extn: data.extn, key: data.key });
      } catch {
        progressEl.textContent = `✖ ${file.name} failed`;
      }
    }
  }
  const workers = Array(Math.min(maxConcurrent, files.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}

export async function handleFileUpload(file, mediaEntity, fileType) {
  const uploadMeta = { id: crypto.randomUUID(), mediaEntity, file, fileType };
  return uploadFile(uploadMeta);
}
