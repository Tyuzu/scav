import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Modal from "../../components/ui/Modal.mjs";
import Datex from "../../components/base/Datex.js";

/** --- API Helpers --- */
async function fetchNotices(entityType, entityId) {
  const res = await apiFetch(`/notices/${entityType}/${entityId}`, "GET");
  return Array.isArray(res) ? res : [];
}

async function createNotice(entityType, entityId, data) {
  return apiFetch(`/notices/${entityType}/${entityId}`, "POST", data);
}

async function updateNotice(entityType, entityId, noticeId, data) {
  return apiFetch(`/notices/${entityType}/${entityId}/${noticeId}`, "PUT", data);
}

async function deleteNotice(entityType, entityId, noticeId) {
  return apiFetch(`/notices/${entityType}/${entityId}/${noticeId}`, "DELETE");
}

/** --- Modal Form for Add/Edit --- */
function openNoticeForm({ notice = {}, entityType, entityId, container, isEdit = false }) {
  const modalContent = createElement("div", { class: "notice-form" }, [
    createElement("label", {}, ["Title:"]),
    createElement("input", { type: "text", value: notice.title || "", id: "notice-title-input" }),
    createElement("label", {}, ["Content:"]),
    createElement("textarea", { id: "notice-content-input" }, [notice.content || ""]),
  ]);

  const saveBtn = Button(isEdit ? "Save Changes" : "Create Notice", "", {
    click: async () => {
      const title = modalContent.querySelector("#notice-title-input").value.trim();
      const content = modalContent.querySelector("#notice-content-input").value.trim();
      if (!title || !content) {
return alert("Both fields are required");
}

      let res;
      if (isEdit) {
        res = await updateNotice(entityType, entityId, notice.noticeid, { title, content });
      } else {
        res = await createNotice(entityType, entityId, { title, content });
      }

      if (res && (res.noticeid || res === null)) {
        modal.close();
        await displayNotices(entityType, entityId, container, true);
      } else {
        alert("Failed to save notice.");
      }
    }
  }, "buttonx");

  modalContent.appendChild(saveBtn);

  const modal = Modal({
    title: isEdit ? "Edit Notice" : "Add Notice",
    content: modalContent,
    size: "medium"
  });
}

/** --- Single Notice Modal --- */
function openNoticeModal(notice, { entityType, entityId, container, isCreator }) {
  const modalContent = createElement("div", { class: "notice-modal-content" });

  const titleEl = createElement("h3", {}, [document.createTextNode(notice.title || "Untitled Notice")]);
  const contentEl = createElement("p", { class: "notice-modal-text" }, [document.createTextNode(notice.content || notice.summary || "")]);
  const dateEl = createElement("small", {}, [document.createTextNode(`Posted on ${Datex(notice.createdAt, true)}`)]);

  modalContent.append(titleEl, contentEl, dateEl);

  if (isCreator) {
    const actions = createElement("div", { class: "notice-modal-actions" });

    const editBtn = Button("✏️ Edit", "", {
      click: () => openNoticeForm({ notice, entityType, entityId, container, isEdit: true })
    }, "buttonx");

    const delBtn = Button("🗑️ Delete", "", {
      click: async () => {
        if (!confirm("Delete this notice?")) {
return;
}
        const res = await deleteNotice(entityType, entityId, notice.noticeid);
        if (res === null) {
          modal.close();
          await displayNotices(entityType, entityId, container, isCreator);
        } else {
          alert("Failed to delete notice.");
        }
      }
    }, "buttonx");

    actions.append(editBtn, delBtn);
    modalContent.appendChild(actions);
  }

  const modal = Modal({
    title: "Notice",
    content: modalContent,
    size: "medium"
  });
}

/** --- Display Notices with Search/Filter --- */
export async function displayNotices(entityType, entityId, container, isCreator) {
  container.replaceChildren();

  // Header + Add button
  const header = createElement("div", { id: "notice-header" }, [
    createElement("h3", {}, [document.createTextNode("Notices")])
  ]);
  if (isCreator) {
    const addBtn = Button("➕ Add Notice", "addNoticeBtn", { click: () => openNoticeForm({ entityType, entityId, container }) }, "buttonx secondary notice-add-btn");
    header.appendChild(addBtn);
  }
  container.appendChild(header);

  // Search + filter inputs
  const controls = createElement("div", { class: "notice-controls" });
  const searchInput = createElement("input", { type: "text", placeholder: "Search title or summary...", class: "notice-search" });
  const dateInput = createElement("input", { type: "date", class: "notice-date-filter" });
  controls.append(searchInput, dateInput);
  container.appendChild(controls);

  // Loading indicator
  const loading = createElement("p", {}, [document.createTextNode("Loading notices...")]);
  container.appendChild(loading);

  const notices = await fetchNotices(entityType, entityId);
  loading.remove();

  const list = createElement("div", { id: "notice-list" });
  container.appendChild(list);

  function renderList(filtered) {
    list.replaceChildren();
    if (filtered.length === 0) {
      list.appendChild(createElement("p", {}, [document.createTextNode("No notices match the criteria.")]));
      return;
    }

    filtered.forEach(notice => {
      const summaryText = notice.summary?.length > 80 ? notice.summary.slice(0, 80) + "..." : notice.summary || "";
      const noticeBox = createElement("div", { class: "notice-item", tabindex: "0", role: "button" }, [
        createElement("h4", {}, [document.createTextNode(notice.title || "Untitled")]),
        createElement("p", {}, [document.createTextNode(summaryText)]),
        createElement("small", {}, [document.createTextNode(`Posted on ${Datex(notice.createdAt, true)}`)])
      ]);
      noticeBox.addEventListener("click", () => openNoticeModal(notice, { entityType, entityId, container, isCreator }));
      list.appendChild(noticeBox);
    });
  }

  renderList(notices);

  // Filter function
  function applyFilters() {
    const search = searchInput.value.trim().toLowerCase();
    const date = dateInput.value;
    const filtered = notices.filter(n => {
      const matchesText = !search || (n.title && n.title.toLowerCase().includes(search)) || (n.summary && n.summary.toLowerCase().includes(search));
      const matchesDate = !date || (n.createdAt && n.createdAt.split("T")[0] === date);
      return matchesText && matchesDate;
    });
    renderList(filtered);
  }

  searchInput.addEventListener("input", applyFilters);
  dateInput.addEventListener("change", applyFilters);
}
