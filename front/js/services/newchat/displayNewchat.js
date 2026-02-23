import { createElement } from "../../components/createElement.js";
import { CHATDROP_URL, CHAT_WS, state } from "../../state/state.js";
import { renderMessage } from "./renderMessage.js";
import { chatFetch } from "../../api/api.js";

export function displayNewChat(contentContainer, chatid, isLoggedIn, currentUserId) {
  clearContainer(contentContainer);

  const chatBox = createElement("div", { class: "chat-box" });
  const messagesContainer = createElement("div", {
    id: "messages",
    class: "messages-container"
  });

  const { inputRow, inputField, sendButton } = createInputRow();
  const { fileInput, uploadButton, dropZone, progressBar } = createUploadElements();

  if (!isLoggedIn) {
    disableInputs([inputField, sendButton, fileInput, uploadButton]);
    chatBox.append(
      createElement("div", { class: "login-warning" }, [
        "You are not logged in."
      ])
    );
  }

  const upcon = createElement("div", { class: "upcon" });
  upcon.append(inputRow, fileInput, uploadButton, progressBar, dropZone);

  chatBox.append(messagesContainer, upcon);
  contentContainer.appendChild(chatBox);

  const socket = createWebSocket(chatid);
  setupSocketListeners(socket, messagesContainer, currentUserId);
  setupMessageSending(inputField, sendButton, socket);
  setupFileUpload(fileInput, uploadButton, dropZone, chatid, progressBar);
}

/* ------------------ Helpers ------------------ */

function clearContainer(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function createInputRow() {
  const inputRow = createElement("div", { class: "input-row" });

  const inputField = createElement("input", {
    type: "text",
    placeholder: "Type a message…",
    id: "messageInput",
    class: "message-input"
  });

  const sendButton = createElement(
    "button",
    { type: "button", class: "send-button" },
    ["Send"]
  );

  inputRow.append(inputField, sendButton);
  return { inputRow, inputField, sendButton };
}

function createUploadElements() {
  const fileInput = createElement("input", {
    type: "file",
    accept: "image/*",
    class: "file-input",
    multiple: true
  });

  const uploadButton = createElement(
    "button",
    { type: "button", class: "upload-button" },
    ["Upload"]
  );

  const dropZone = createElement(
    "div",
    { class: "drop-zone" },
    ["Drag & drop files here"]
  );

  const progressBar = createElement("progress", {
    value: 0,
    max: 100,
    class: "upload-progress"
  });

  progressBar.style.display = "none";

  return { fileInput, uploadButton, dropZone, progressBar };
}

function disableInputs(elements) {
  elements.forEach(el => (el.disabled = true));
}

function createWebSocket(chatid) {
  const token = state.token;

  let base = CHAT_WS;

  // If no protocol present, add one
  if (!base.startsWith("ws://") && !base.startsWith("wss://")) {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    base = `${protocol}://${base}`;
  }

  return new WebSocket(
    `${base}/${encodeURIComponent(chatid)}?token=${encodeURIComponent(token)}`
  );
}

function setupSocketListeners(socket, messagesContainer, currentUserId) {
  socket.addEventListener("message", async event => {
    try {
      const msg = JSON.parse(event.data);
      await renderMessage(msg, messagesContainer, currentUserId, socket);
    } catch (err) {
      console.error("Invalid WS payload", err);
    }
  });
}

function setupMessageSending(inputField, sendButton, socket) {
  sendButton.addEventListener("click", () => {
    const content = inputField.value.trim();
    if (!content || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({ action: "chat", content }));
    inputField.value = "";
  });

  inputField.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendButton.click();
    }
  });
}

function setupFileUpload(fileInput, uploadButton, dropZone, chatid, progressBar) {
  const validateFile = file =>
    file.type.startsWith("image/") &&
    file.size <= 10 * 1024 * 1024;

  const uploadFile = file => {
    if (!validateFile(file)) {
      alert("Invalid file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CHATDROP_URL);

    if (state.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
    }

    progressBar.value = 0;
    progressBar.style.display = "block";

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        progressBar.value = (e.loaded / e.total) * 100;
      }
    };

    xhr.onload = () => {
      progressBar.style.display = "none";
      fileInput.value = "";

      let uploaded;
      try {
        uploaded = JSON.parse(xhr.responseText);
      } catch {
        return;
      }

      if (!Array.isArray(uploaded)) return;

      chatFetch(
        "/newchat/upload",
        "POST",
        JSON.stringify({
          chat: chatid,
          files: uploaded
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${state.token}`
          }
        }
      );
      // DO NOT render manually — WS broadcast will handle it
    };

    xhr.onerror = () => {
      progressBar.style.display = "none";
      alert("Upload failed");
    };

    xhr.send(formData);
  };

  uploadButton.addEventListener("click", () => {
    Array.from(fileInput.files).forEach(uploadFile);
  });

  dropZone.addEventListener("dragover", e => e.preventDefault());
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  });
}
