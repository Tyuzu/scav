import { createElement } from "../../../components/createElement.js";
import { getState } from "../../../state/state.js";
import { renderAvatar } from "./renderAvatar.js";
import { renderMedia } from "./renderMedia.js";
import { renderMenu } from "./renderMenu.js";

/* -------------------------
   Header Renderer
--------------------------*/
function renderHeader(msg, time, isMine) {
  const senderLabel = msg.senderName || msg.sender || "Unknown";

  const sender = createElement(
    "span",
    { class: "msg-sender", tabIndex: "0" },
    [senderLabel]
  );

  const timestamp = createElement(
    "span",
    { class: "msg-time" },
    [time]
  );

  const edited = msg.editedAt
    ? createElement("span", { class: "msg-edited" }, [" (edited)"])
    : null;

  const status =
    isMine && msg.status
      ? createElement(
          "span",
          { class: "msg-status" },
          [msg.status === "read" ? "✓✓" : "✓"]
        )
      : null;

  const menu = renderMenu(msg);

  const children = [sender, timestamp];
  if (edited) {
children.push(edited);
}
  if (menu) {
children.push(menu);
}
  if (status) {
children.push(status);
}

  return createElement("div", { class: "msg-header" }, children);
}

/* -------------------------
   Body Renderer
--------------------------*/
function renderBody(msg) {
  if (msg.deleted) {
    return createElement("div", { class: "msg-content" }, ["[deleted]"]);
  }

  const nodes = [];

  if (msg.content) {
    const text = String(msg.content).trim();
    if (text) {
      nodes.push(text.length > 300 ? text.slice(0, 300) + "…" : text);
    }
  }

  const media = renderMedia(msg);
  if (media) {
nodes.push(media);
}

  return createElement("div", { class: "msg-content" }, nodes);
}

/* -------------------------
   Message Renderer
--------------------------*/
export function renderMessage(msg) {
  const user = getState("user");
  const isMine = msg.sender === user || msg.sender?.id === user?.id;

  const classes = ["message-item", isMine ? "mine" : "theirs"];
  if (msg.deleted) {
classes.push("deleted");
}
  if (msg.media) {
classes.push("attachment");
}

  const createdAt = msg.createdAt ? new Date(msg.createdAt) : new Date();
  const time = isNaN(createdAt)
    ? ""
    : createdAt.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });

  const avatar = renderAvatar(msg, { isMine });
  const header = renderHeader(msg, time, isMine);
  const body = renderBody(msg);

  const msgBody = createElement("div", { class: "msg-body" }, [header, body]);
  const msgId = msg.messageid || msg.id || "";

  return createElement(
    "div",
    {
      class: classes.join(" "),
      dataset: { id: msgId },
      role: "article",
      tabIndex: "0",
      "aria-label": `Message at ${time}`
    },
    [avatar, msgBody]
  );
}
