import Button from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";
import { mereFetch } from "../../../api/api.js";

export function renderMenu(msg) {
  // hard guards
  if (!msg || msg.deleted) {
return null;
}

  const messageId =
    typeof msg.messageid === "string" && msg.messageid.trim()
      ? msg.messageid
      : null;

  return createElement("div", { class: "msg-menu" }, [
    Button("⋮", "menu-btn", {
      click: e => {
        e.stopPropagation();
        const dropdown = e.currentTarget.nextSibling;
        if (dropdown) {
dropdown.classList.toggle("open");
}
      }
    }),

    createElement(
      "div",
      { class: "dropdown" },
      [
        messageId &&
          Button("Edit", "", {
            click: () => handleEdit(messageId)
          }),

        messageId &&
          Button("Delete", "", {
            click: () => handleDelete(messageId)
          }),

        msg.content &&
          Button("Copy", "", {
            click: () => navigator.clipboard.writeText(msg.content)
          })
      ].filter(Boolean) // remove null buttons cleanly
    )
  ]);
}

async function handleEdit(id) {
  if (!id) {
return;
}

  const text = prompt("Edit message:");
  if (!text || !text.trim()) {
return;
}

  await mereFetch(
    `/merechats/messages/${id}`,
    "PUT",
    { content: text.trim() }
  );
}

async function handleDelete(id) {
  if (!id) {
return;
}

  if (!confirm("Delete this message?")) {
return;
}

  await mereFetch(
    `/merechats/messages/${id}`,
    "DELETE"
  );
}
