// songsTab.js
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import Modal from "../../components/ui/Modal.mjs";
import Imagex from "../../components/base/Imagex.js";
import Notify from "../../components/ui/Notify.mjs";
import { uploadFile } from "../media/api/mediaApi.js";
// import { createPlayerFooter, playSong, setSongQueue, setCurrentIndex } from "./player.js";

// ------------------------ Open Song Modal ------------------------
// function openSongModal({ mode, song = {}, artistID, _container, _isCreator }) {
//     const isEdit = mode === "edit";
//     const form = createSongForm(song);

//     const closeModal = () => {
//         form.closest(".modal")?.remove();
//         document.body.style.overflow = "";
//     };

//     Modal({
//         title: isEdit ? `Edit Song: ${song.title}` : "Upload New Song",
//         content: form,
//         onClose: closeModal
//     });

//     const audioInput = form.querySelector('input[name="audio"]');
//     const durationInput = form.querySelector('input[name="duration"]');
//     const titleInput = form.querySelector('input[name="title"]');
//     const submitBtn = form.querySelector('button[type="submit"]');

//     let durationLoaded = Boolean(durationInput.value);

//     submitBtn.disabled = !durationLoaded;

//     // ------------------ AUDIO METADATA HANDLING ------------------
//     audioInput.addEventListener("change", () => {
//         const file = audioInput.files[0];

//         durationLoaded = false;
//         submitBtn.disabled = true;
//         durationInput.value = "";

//         if (!file) {
// return;
// }

//         if (!titleInput.value) {
//             titleInput.value = file.name.replace(/\.[^/.]+$/, "");
//         }

//         const audioEl = document.createElement("audio");
//         audioEl.preload = "metadata";
//         audioEl.src = URL.createObjectURL(file);

//         audioEl.addEventListener("loadedmetadata", () => {
//             URL.revokeObjectURL(audioEl.src);

//             const totalSeconds = Math.floor(audioEl.duration);
//             if (!totalSeconds || Number.isNaN(totalSeconds)) {
// return;
// }

//             const mins = Math.floor(totalSeconds / 60);
//             const secs = (totalSeconds % 60).toString().padStart(2, "0");

//             durationInput.value = `${mins}:${secs}`;
//             durationLoaded = true;
//             submitBtn.disabled = false;
//         });
//     });

//     // ------------------ FORM SUBMIT ------------------
//     form.addEventListener("submit", async e => {
//         e.preventDefault();

//         if (!durationLoaded) {
//             Notify("Audio duration not loaded yet", "error");
//             return;
//         }

//         try {
//             const uploadedFiles = {};

//             const audioFile = audioInput.files[0];
//             if (audioFile) {
//                 const res = await uploadFile({
//                     id: `audio-${Date.now()}`,
//                     file: audioFile,
//                     fileType: "audio",
//                     mediaEntity: "song"
//                 });
//                 uploadedFiles.audio = res.filename || res.key;
//                 uploadedFiles.audioextn = res.extn;
//             }

//             const posterInput = form.querySelector('input[name="poster"]');
//             const posterFile = posterInput.files[0];
//             if (posterFile) {
//                 const res = await uploadFile({
//                     id: `poster-${Date.now()}`,
//                     file: posterFile,
//                     fileType: "poster",
//                     mediaEntity: "song"
//                 });
//                 uploadedFiles.poster = res.filename || res.key;
//                 uploadedFiles.posterextn = res.extn;
//             }

//             const payload = {
//                 title: titleInput.value.trim(),
//                 genre: form.querySelector('input[name="genre"]').value.trim(),
//                 duration: durationInput.value.trim(),
//                 description: form.querySelector('input[name="description"]').value.trim() || ""
//             };

//             if (uploadedFiles.audio) {
//                 payload.audio = uploadedFiles.audio;
//                 payload.audioextn = uploadedFiles.audioextn || ".m4a";
//             }

//             if (uploadedFiles.poster) {
//                 payload.poster = uploadedFiles.poster;
//                 payload.posterextn = uploadedFiles.posterextn || ".png";
//             }

//             const url = isEdit
//                 ? `/artists/${artistID}/songs/${encodeURIComponent(song.songid)}/edit`
//                 : `/artists/${artistID}/songs`;

//             const method = isEdit ? "PUT" : "POST";

//             await apiFetch(url, method, JSON.stringify(payload), {
//                 headers: { "Content-Type": "application/json" }
//             });

//             closeModal();
//             Notify("Song saved successfully", "success");
//         } catch (err) {
//             console.error(err);
//             Notify(`Upload failed: ${err.message}`, "error");
//         }
//     });
// }

function openSongModal({ mode, song = {}, artistID, _container, _isCreator }) {
    const isEdit = mode === "edit";
    const form = createSongForm(song);

    const modalInstance = Modal({
        title: isEdit ? `Edit Song: ${song.title}` : "Upload New Song",
        content: form,
        onClose: () => {
            // optional external cleanup if needed
        },
        autofocusSelector: 'input[name="title"]'
    });

    const closeModal = () => {
        modalInstance?.close();
    };

    const audioInput = form.querySelector('input[name="audio"]');
    const durationInput = form.querySelector('input[name="duration"]');
    const titleInput = form.querySelector('input[name="title"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    let durationLoaded = Boolean(durationInput.value);
    submitBtn.disabled = !durationLoaded;

    // -------- AUDIO METADATA --------
    audioInput.addEventListener("change", () => {
        const file = audioInput.files?.[0];

        durationLoaded = false;
        submitBtn.disabled = true;
        durationInput.value = "";

        if (!file) {
            return;
        }

        if (!titleInput.value) {
            titleInput.value = file.name.replace(/\.[^/.]+$/, "");
        }

        const audioEl = document.createElement("audio");
        audioEl.preload = "metadata";
        audioEl.src = URL.createObjectURL(file);

        audioEl.addEventListener("loadedmetadata", () => {
            URL.revokeObjectURL(audioEl.src);

            const totalSeconds = Math.floor(audioEl.duration);
            if (!totalSeconds || Number.isNaN(totalSeconds)) {
                return;
            }

            const mins = Math.floor(totalSeconds / 60);
            const secs = (totalSeconds % 60).toString().padStart(2, "0");

            durationInput.value = `${mins}:${secs}`;
            durationLoaded = true;
            submitBtn.disabled = false;
        });
    });

    // -------- FORM SUBMIT --------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!durationLoaded) {
            Notify("Audio duration not loaded yet", "error");
            return;
        }

        try {
            const uploadedFiles = {};

            const audioFile = audioInput.files?.[0];
            if (audioFile) {
                const res = await uploadFile({
                    id: `audio-${Date.now()}`,
                    file: audioFile,
                    fileType: "audio",
                    mediaEntity: "song"
                });
                uploadedFiles.audio = res.filename || res.key;
                uploadedFiles.audioextn = res.extn;
            }

            const posterInput = form.querySelector('input[name="poster"]');
            const posterFile = posterInput.files?.[0];

            if (posterFile) {
                const res = await uploadFile({
                    id: `poster-${Date.now()}`,
                    file: posterFile,
                    fileType: "poster",
                    mediaEntity: "song"
                });
                uploadedFiles.poster = res.filename || res.key;
                uploadedFiles.posterextn = res.extn;
            }

            const payload = {
                title: titleInput.value.trim(),
                genre: form.querySelector('[name="genre"]').value.trim(),
                duration: durationInput.value.trim(),
                description: form.querySelector('[name="description"]').value.trim() || ""
            };

            if (uploadedFiles.audio) {
                payload.audio = uploadedFiles.audio;
                payload.audioextn = uploadedFiles.audioextn || ".m4a";
            }

            if (uploadedFiles.poster) {
                payload.poster = uploadedFiles.poster;
                payload.posterextn = uploadedFiles.posterextn || ".png";
            }

            const url = isEdit
                ? `/artists/${artistID}/songs/${encodeURIComponent(song.songid)}/edit`
                : `/artists/${artistID}/songs`;

            const method = isEdit ? "PUT" : "POST";

            await apiFetch(url, method, JSON.stringify(payload), {
                headers: { "Content-Type": "application/json" }
            });

            closeModal();
            Notify("Song saved successfully", "success");

        } catch (err) {
            console.error(err);
            Notify(`Upload failed: ${err.message}`, "error");
        }
    });
}

// ------------------------ Song Form ------------------------
function createSongForm(song = {}) {
    const audioPreview = createElement("audio", { controls: true, style: "display:none; margin-top:10px;" });
    const imagePreview = Imagex({ style: "display:none; max-height:120px; margin-top:10px;" });

    const audioGroup = createFormGroup({ type: "file", name: "audio", label: "Audio File", accept: "audio/*", additionalNodes: [audioPreview] });
    const imageGroup = createFormGroup({ type: "file", name: "poster", label: "Poster Image", accept: "image/*", additionalNodes: [imagePreview] });

    setupFilePreview(audioGroup.querySelector("input"), audioPreview, "audio");
    setupFilePreview(imageGroup.querySelector("input"), imagePreview, "image");

    return createElement("form", { class: "song-form" }, [
        createFormGroup({ type: "text", id: "title", name: "title", label: "Title", value: song.title || "", placeholder: "Song Title", required: true }),
        createFormGroup({ type: "text", id: "genre", name: "genre", label: "Genre", value: song.genre || "", placeholder: "Genre", required: true }),
        createFormGroup({ type: "text", id: "duration", name: "duration", label: "Duration", value: song.duration || "", placeholder: "Duration", required: true }),
        createFormGroup({ type: "text", id: "description", name: "description", label: "Description", value: song.description || "", placeholder: "Description (optional)" }),
        audioGroup,
        imageGroup,
        createElement("button", { type: "submit" }, [song.songid ? "Save Changes" : "Add Song"]),
    ]);
}

// ------------------------ File Preview ------------------------
function setupFilePreview(input, preview, type) {
    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) {
            preview.style.display = "none"; return;
        }

        const url = URL.createObjectURL(file);
        if (type === "audio" && file.type.startsWith("audio/")) {
            preview.src = url; preview.load(); preview.style.display = "block";
        }
        if (type === "image" && file.type.startsWith("image/")) {
            preview.src = url; preview.style.display = "block";
        }
    });
}

// export { renderSongsTab, openSongModal };
export { openSongModal };
