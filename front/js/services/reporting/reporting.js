import { getState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";

const REPORT_REASONS = [
  { value: "", label: "Select a reason…" },
  { value: "Spam", label: "Spam" },
  { value: "Harassment", label: "Harassment" },
  { value: "Inappropriate", label: "Inappropriate" },
  { value: "Other", label: "Other" }
];

export function reportPost(targetId, targetType, parentType = "", parentId = "") {
  const userId = getState("user");
  if (!userId) {
    Notify("You must be logged in to report content.", { type: "error" });
    return;
  }

  const storageKey = `reported:${userId}:${targetType}:${targetId}`;
  if (localStorage.getItem(storageKey)) {
    Notify("You already reported this item.", { type: "info" });
    return;
  }

  const content = createElement("div", { class: "vflex" });

  const reasonLabel = createElement("label", {}, ["Reason"]);
  const reasonSelect = createElement(
    "select",
    {},
    REPORT_REASONS.map(opt =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  );

  const notesLabel = createElement("label", {}, ["Notes (optional)"]);
  const notesTextarea = createElement(
    "textarea",
    { rows: "4", placeholder: "Add details if needed…" },
    []
  );

  const messageP = createElement("p", {
    style: "color:#c00;font-size:0.85rem;min-height:1em;"
  });

  const submitBtn = createElement("button", { type: "button", disabled: true }, ["Submit"]);
  const cancelBtn = createElement("button", { type: "button" }, ["Cancel"]);

  content.append(
    reasonLabel,
    reasonSelect,
    notesLabel,
    notesTextarea,
    messageP,
    submitBtn,
    cancelBtn
  );

  const { close } = Modal({
    title: "Report Content",
    content
  });

  reasonSelect.addEventListener("change", () => {
    submitBtn.disabled = !reasonSelect.value;
  });

  cancelBtn.addEventListener("click", close);

  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    messageP.textContent = "";

    const payload = {
      targetId,
      targetType,
      parentType,
      parentId,
      reason: reasonSelect.value,
      notes: notesTextarea.value.trim()
    };

    try {
      const res = await apiFetch("/report", "POST", payload);

      if (res && res.reportId) {
        localStorage.setItem(storageKey, "1");
        close();
        Notify("Report submitted. Thank you.", { type: "success" });
        return;
      }

      messageP.textContent = res?.error || "Failed to submit report.";
    } catch (err) {
      if (err?.status === 409) {
        localStorage.setItem(storageKey, "1");
        close();
        Notify("You already reported this item.", { type: "info" });
        return;
      }
      messageP.textContent = "Network error. Try again.";
    } finally {
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}

export function appealContent(targetId, targetType) {
  const userId = getState("user");
  if (!userId) {
    Notify("You must be logged in to submit an appeal.", { type: "error" });
    return;
  }

  const content = createElement("div", { class: "vflex" });

  const info = createElement("p", {}, [
    "Explain why this content should be restored."
  ]);

  const textarea = createElement(
    "textarea",
    { rows: "5", placeholder: "Your explanation…" },
    []
  );

  const messageP = createElement("p", {
    style: "color:#c00;font-size:0.85rem;min-height:1em;"
  });

  const submitBtn = createElement("button", { type: "button", disabled: true }, ["Submit Appeal"]);
  const cancelBtn = createElement("button", { type: "button" }, ["Cancel"]);

  content.append(info, textarea, messageP, submitBtn, cancelBtn);

  const { close } = Modal({
    title: "Submit Appeal",
    content
  });

  textarea.addEventListener("input", () => {
    submitBtn.disabled = textarea.value.trim().length < 10;
  });

  cancelBtn.addEventListener("click", close);

  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    messageP.textContent = "";

    try {
      const res = await apiFetch("/appeals", "POST", {
        targetId,
        targetType,
        reason: textarea.value.trim()
      });

      if (res?.appealId) {
        close();
        Notify("Appeal submitted for review.", { type: "success" });
        return;
      }

      messageP.textContent = res?.error || "Failed to submit appeal.";
    } catch (err) {
      if (err?.status === 409) {
        messageP.textContent = "You already have a pending appeal.";
      } else {
        messageP.textContent = "Network error. Try again.";
      }
    } finally {
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}
