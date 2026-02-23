import { apiFetch } from "../api/api";
import { createElement } from "../components/createElement";
import { FILEDROP_URL } from "../state/state";
import Notify from "../components/ui/Notify.mjs";

const CHUNK_SIZE = 256 * 1024; // 256KB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

// Validate file MIME type by reading first 512 bytes (like backend)
async function validateFile(file) {
    const blob = file.slice(0, 512);
    const buffer = await blob.arrayBuffer();
    const arr = new Uint8Array(buffer);
    const header = String.fromCharCode.apply(null, arr);
    const mime = new Blob([header]).type || file.type;

    if (!ALLOWED_TYPES.includes(mime)) {
        throw new Error(`Unsupported file type: ${file.type}`);
    }
}

export async function uploadChunk(formData, signal) {
    const res = await fetch(`${FILEDROP_URL}/uploads/chunk`, {
        method: "POST",
        body: formData,
        signal
    });

    if (!res.ok) throw new Error("Chunk upload failed");
    return await res.json();
}

export async function uploadFileInChunks({
    file,
    entityType,
    pictureType,
    entityId,
    token,
    signal,
    onProgress = () => {},
    maxRetries = 3
}) {
    await validateFile(file); // frontend MIME check

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("meta", JSON.stringify({
            fileName: file.name,
            chunkIndex: i,
            totalChunks,
            entityType,
            pictureType,
            entityId,
            token
        }));

        let attempt = 0;
        let success = false;
        while (attempt < maxRetries && !success) {
            try {
                await uploadChunk(formData, signal);
                success = true;
            } catch (err) {
                attempt++;
                if (attempt === maxRetries) throw err;
                await new Promise(res => setTimeout(res, 500 * attempt));
            }
        }

        uploadedBytes += chunk.size;
        const percent = Math.round((uploadedBytes / file.size) * 100);
        onProgress(percent);
    }

    return { fileName: file.name, status: "uploaded" };
}

export async function uploadImagesWithQueue({
    files,
    entityType,
    pictureType,
    entityId,
    token,
    containerEl,
    onComplete = () => {},
    onError = () => {},
    concurrency = 3
}) {
    const queue = files.filter(file => ALLOWED_TYPES.includes(file.type));
    const uploaded = [];
    const failed = [];
    const controllers = [];

    if (queue.length < files.length) {
        Notify("Only .jpg and .png files are allowed.", {type:"warning",duration:3000, dismissible:true});
    }

    function createProgressBar(fileName) {
        const label = createElement("div", {}, [`Uploading ${fileName}`]);
        const bar = createElement("progress", { max: 100, value: 0 });
        const wrapper = createElement("div", { class: "upload-progress-wrapper" }, [label, bar]);
        containerEl.appendChild(wrapper);
        return bar;
    }

    async function startNext(slotId) {
        while (queue.length) {
            const file = queue.shift();
            const controller = new AbortController();
            controllers.push(controller);

            const bar = createProgressBar(file.name);

            try {
                const result = await uploadFileInChunks({
                    file,
                    entityType,
                    pictureType,
                    entityId,
                    token,
                    signal: controller.signal,
                    onProgress: percent => bar.value = percent
                });
                uploaded.push(result);
            } catch (err) {
                failed.push({ file, error: err.message });
                bar.value = 0;
                bar.classList.add("error");
                Notify(`Upload failed: ${file.name}`, {type:"error",duration:3000, dismissible:true});
            }
        }
    }

    // Run slots concurrently
    const slots = Array.from({ length: concurrency }, (_, i) => startNext(i));
    await Promise.all(slots);

    if (uploaded.length) onComplete(uploaded);
    if (failed.length) onError(failed);

    return {
        cancelAll: () => controllers.forEach(ctrl => ctrl.abort())
    };
}


async function fileAlreadyExists({ entityType, pictureType, entityId, fileName }) {
    try {
        const res = await fetch(
            `${FILEDROP_URL}/uploads/exists?entityType=${entityType}&pictureType=${pictureType}&entityId=${entityId}&fileName=${encodeURIComponent(fileName)}`,
            { method: 'HEAD' }
        );
        return res.ok;
    } catch {
        return false;
    }
}
