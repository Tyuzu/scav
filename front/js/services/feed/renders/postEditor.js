import Modal from "../../../components/ui/Modal.mjs";
import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { createFormGroup } from "../../../components/createFormGroup.js";

export function openEditModal(post) {
  // --- form fields ---
  let titleField, descField, tagsField, subtitleInput, langSelect;

  const textField = createFormGroup({
    type: "textarea",
    value: post.text || "",
    label: post.type === "text" ? "Caption/Text:" : "",
    id: "edit-text"
  });

  if (post.type === "video" || post.type === "audio") {
    titleField = createFormGroup({
      type: "text",
      value: post.title || "",
      label: "Title:",
      id: "edit-title",
      placeholder: "Title"
    });

    descField = createFormGroup({
      type: "textarea",
      value: post.description || "",
      label: "Description:",
      id: "edit-desc",
      placeholder: "Description"
    });

    tagsField = createFormGroup({
      type: "text",
      value: (post.tags || []).join(", "),
      label: "Tags:",
      id: "edit-tags",
      placeholder: "Tags (comma separated)"
    });

    if (post.type === "video") {
      subtitleInput = createFormGroup({
        type: "file",
        accept: ".vtt",
        label: "Upload Subtitles:",
        id: "edit-subtitle"
      });

      langSelect = createFormGroup({
        type: "select",
        label: "Subtitle Language:",
        id: "edit-subtitle-lang",
        options: [
          { value: "en", label: "English (default)" },
          { value: "es", label: "Spanish" },
          { value: "fr", label: "French" },
          { value: "de", label: "German" },
          { value: "zh", label: "Chinese" },
          { value: "ar", label: "Arabic" }
        ],
        value: "en"
      });
    }
  }

  // --- action buttons ---
  const saveBtn = createElement("button", { class: "save-btn" }, ["Save"]);
  const cancelBtn = createElement("button", { class: "cancel-btn" }, ["Cancel"]);

  // --- assemble content ---
  const editorChildren = [];
  if (post.type === "text" || post.type === "image") editorChildren.push(textField);
  if (post.type === "video" || post.type === "audio") {
    editorChildren.push(titleField, descField, tagsField);
    if (post.type === "video") editorChildren.push(subtitleInput, langSelect);
  }
  editorChildren.push(
    createElement("div", { class: "edit-actions" }, [saveBtn, cancelBtn])
  );

  const editor = createElement("div", { class: "edit-container" }, editorChildren);

  // --- Modal initialization ---
  const { close } = Modal({
    title: "Edit Post",
    content: editor,
    size: "large",
    closeOnOverlayClick: true,
    returnDataOnClose: false,
    onClose: () => {}
  });

  // --- Cancel ---
  cancelBtn.addEventListener("click", () => close());

  // --- Save ---
  saveBtn.addEventListener("click", async () => {
    try {
      const body = {};

      if (post.type === "text" || post.type === "image") {
        body.text = textField.querySelector("textarea").value;
      }

      if (post.type === "video" || post.type === "audio") {
        body.title = titleField.querySelector("input").value;
        body.description = descField.querySelector("textarea").value;
        body.tags = tagsField
          .querySelector("input")
          .value.split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      const updated = await apiFetch(`/feed/post/${post.postid}`, "PATCH", body);

      // Handle subtitles if applicable
      if (post.type === "video" && subtitleInput) {
        const fileInput = subtitleInput.querySelector("input");
        if (fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("subtitle", fileInput.files[0]);
          const lang = langSelect.querySelector("select").value || "en";
          formData.append("lang", lang);

          await apiFetch(
            `/feed/post/${post.postid}/subtitles/${lang}`,
            "POST",
            formData,
            { isForm: true }
          );
        }
      }

      Notify("Post updated successfully", { type: "success", duration: 2000 });
      close();

      // Optionally re-render post if you want:
      // renderPost(updated, postsContainer, i);

    } catch (err) {
      console.error(err);
      Notify("Failed to update post", { type: "error", duration: 3000 });
    }
  });
}
