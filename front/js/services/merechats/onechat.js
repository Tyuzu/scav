import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import {
  ChatState,
  pendingMap,
  renderedIdsMap,
  connectWebSocket,
  closeExistingSocket,
  getMessageContainer,
  setMessageContainer,
  mountMessage
} from "./chatSocket.js";
import { mereFetch } from "../../api/api.js";
import { debounce } from "../../utils/deutils.js";
import { MERE_URL, getState } from "../../state/state.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import { t } from "./i18n.js";
import { getFileType } from "../media/mediaCommon.js";

/* -------------------------
   Safe fetch
--------------------------*/
export async function safemereFetch(url, method = "GET", body = null, options = {}) {
  try {
    return await mereFetch(url, method, body, options);
  } catch {
    return null;
  }
}

/* -------------------------
   Helpers
--------------------------*/
function ensureRenderedSet(chatid) {
  let set = renderedIdsMap.get(chatid);
  if (!set) {
    set = new Set();
    renderedIdsMap.set(chatid, set);
  }
  return set;
}

function extToMime(ext) {
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime"
  }[ext] || "application/octet-stream";
}

/* -------------------------
   Send message (WS first)
--------------------------*/
export function sendMessage(chatid, content) {
  if (!content || !content.trim()) {
return;
}

  const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const optimistic = {
    messageid: clientId,
    sender: getState("user"),
    content,
    createdAt: new Date().toISOString()
  };

  const el = mountMessage(optimistic);
  pendingMap.set(clientId, { el, chatid });

  const ws = ChatState.getSocket();
  const payload = { type: "message", chatid, content, clientId };

  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
      return;
    } catch {}
  }

  sendMessageRESTFallback(chatid, content, clientId);
}

async function sendMessageRESTFallback(chatid, content, clientId) {
  try {
    const msg = await mereFetch(
      `/merechats/chat/${encodeURIComponent(chatid)}/message`,
      "POST",
      JSON.stringify({ content, clientId })
    );

    reconcilePending(chatid, clientId, msg);
  } catch (e) {
    console.error("REST send failed", e);
    pendingMap.delete(clientId);
  }
}

function reconcilePending(chatid, clientId, serverMsg) {
  if (!serverMsg?.messageid) {
return;
}

  const rendered = ensureRenderedSet(chatid);
  const realId = String(serverMsg.messageid);

  const pending = pendingMap.get(clientId);
  if (pending?.el) {
    // If the pending entry carries a local preview URL (from upload), inject it
    // into the server message so the newly mounted message shows the local copy.
    if (pending.previewUrl && serverMsg.media) {
      serverMsg.media = serverMsg.media || {};
      // override displayed url with local preview for UX; server url remains in other fields
      serverMsg.media.url = pending.previewUrl;
      serverMsg.media.__local_preview = true;
    }

    pending.el.replaceWith(mountMessage(serverMsg));
  } else if (!rendered.has(realId)) {
    // No pending element: if we have a global map of local previews keyed by media id,
    // we could also inject it here. For now, mount server message as-is.
    mountMessage(serverMsg);
  }

  rendered.add(realId);

  // cleanup: if pending carried a preview URL, keep a short-lived revoke to avoid leaks.
  if (pending?.previewUrl) {
    try {
      const url = pending.previewUrl;
      // revoke after a delay to allow the image element to load from the blob URL.
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }, 60 * 1000); // 60s
    } catch {}
  }

  pendingMap.delete(clientId);
}

/* -------------------------
   Load history
--------------------------*/
async function loadHistory(chatid) {
  const container = getMessageContainer();
  if (!container) {
return;
}

  container.replaceChildren();
  const rendered = ensureRenderedSet(chatid);

  try {
    const msgs =
      (await safemereFetch(
        `/merechats/chat/${encodeURIComponent(chatid)}/messages`
      )) || [];

    for (const m of msgs) {
      const id = String(m.messageid);
      if (!rendered.has(id)) {
        mountMessage(m);
        rendered.add(id);
      }
    }
  } catch (e) {
    console.error("loadHistory failed", e);
  }
}

/* -------------------------
   Upload attachment
   - show local preview on optimistic message
   - ensure mounted server message uses local preview immediately on success
--------------------------*/
async function uploadAttachment(chatid, fileInput) {
  const file = fileInput.files?.[0];
  if (!file) {
return;
}

  // create a stable preview URL for local display
  const previewUrl = URL.createObjectURL(file);

  const mediaId = uid();
  const clientId = `f_${mediaId}`;

  const optimistic = {
    messageid: clientId,
    sender: getState("user"),
    createdAt: new Date().toISOString(),
    media: {
      // show local preview immediately
      url: previewUrl,
      type: file.type.startsWith("video") ? "video" : "image",
      mimeType: file.type,
      // keep a reference to the eventual media id so server reconcile can match if needed
      mediaId
    }
  };

  const el = mountMessage(optimistic);
  // store previewUrl on pending so reconcile can inject it into server message
  pendingMap.set(clientId, { el, chatid, previewUrl });

  try {
    const upload = await uploadFile({
      file,
      id: mediaId,
      mediaEntity: "chat",
      fileType: getFileType(file)
    });

    if (!upload?.filename || !upload?.extn) {
      throw new Error("upload failed");
    }

    const form = new FormData();
    form.append("mediaid", mediaId);
    form.append("savedname", upload.filename);
    form.append("extn", upload.extn);
    form.append("mimeType", extToMime(upload.extn));
    form.append("fileSize", file.size);

    const res = await fetch(
      `${MERE_URL}/merechats/chat/${encodeURIComponent(chatid)}/upload`,
      {
        method: "POST",
        body: form,
        headers: {
          Authorization: `Bearer ${getState("token") || ""}`
        }
      }
    );

    if (!res.ok) {
throw new Error(await res.text());
}

    const msg = await res.json();

    // When server returns the canonical message, inject the previewUrl so the mounted
    // server message shows the local copy immediately instead of requiring a roundtrip to the server asset.
    if (msg && msg.media && previewUrl) {
      msg.media = msg.media || {};
      msg.media.url = previewUrl;
      msg.media.__local_preview = true;
    }

    reconcilePending(chatid, clientId, msg);
  } catch (e) {
    console.error("Upload failed", e);
    // remove optimistic element if upload failed
    const pending = pendingMap.get(clientId);
    if (pending?.el) {
      try {
        pending.el.remove();
      } catch {}
    }
    pendingMap.delete(clientId);

    // revoke preview URL immediately on failure
    try {
      URL.revokeObjectURL(previewUrl);
    } catch {}
  } finally {
    fileInput.value = "";
  }
}

/* -------------------------
   UI
--------------------------*/
export async function displayOneChat(containerx, chatid) {
  closeExistingSocket("chat-switch");

  const container = createElement("div", { class: "onechatcon" });
  containerx.replaceChildren(container);

  const header = createElement("div", { class: "chat-header" }, [
    `${t("chat.with")} ${chatid}`
  ]);

  const messages = createElement("div", {
    class: "chat-messages",
    role: "log",
    "aria-live": "polite"
  });

  const input = createElement("input", {
    type: "text",
    placeholder: t("chat.type_message")
  });

  const fileInput = createElement("input", {
    type: "file",
    style: "display:none"
  });

  const uploadBtn = Button(
    t("chat.upload"),
    "",
    { click: () => fileInput.click() },
    "chat-upload-btn"
  );

  fileInput.addEventListener("change", () =>
    uploadAttachment(chatid, fileInput)
  );

  const sendBtn = Button(
    t("chat.send"),
    "",
    {
      click: () => {
        const txt = input.value.trim();
        if (txt) {
          sendMessage(chatid, txt);
          input.value = "";
        }
      }
    },
    "chat-send-btn"
  );

  input.addEventListener(
    "input",
    debounce(() => {
      const ws = ChatState.getSocket();
      if (ws?.readyState === WebSocket.OPEN && input.value.trim().length > 1) {
        ws.send(JSON.stringify({ type: "typing", chatid }));
      }
    }, 800)
  );

  container.append(
    header,
    messages,
    createElement("div", { class: "chat-footer" }, [
      uploadBtn,
      fileInput,
      input,
      sendBtn
    ])
  );

  ChatState.setChatId(chatid);
  setMessageContainer(messages);

  await loadHistory(chatid);
  connectWebSocket();
}

/* -------------------------
   Manual close
--------------------------*/
export function closeSocket() {
  closeExistingSocket("manual");
}
