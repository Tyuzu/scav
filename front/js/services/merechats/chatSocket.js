import { getState,  MERE_WS } from "../../state/state.js";
import { renderMessage } from "./components/index.js";

/* -------------------------
   Module state
--------------------------*/
const pendingMap = new Map();           // clientId -> { el, chatid }
const renderedIdsMap = new Map();       // chatid -> Set(messageid)

/* -------------------------
   ChatState (singleton)
--------------------------*/
const ChatState = (() => {
  let socket = null;
  let reconnectAttempts = 0;
  let currentChatId = null;

  return {
    setSocket: ws => { socket = ws; },
    getSocket: () => socket,

    setReconnectAttempts: n => { reconnectAttempts = n; },
    getReconnectAttempts: () => reconnectAttempts,
    incrementReconnectAttempts: () => { reconnectAttempts += 1; },
    resetReconnectAttempts: () => { reconnectAttempts = 0; },

    setChatId: id => {
      currentChatId = id;
      if (!renderedIdsMap.has(id)) {
        renderedIdsMap.set(id, new Set());
      }
    },
    getChatId: () => currentChatId
  };
})();

/* -------------------------
   Shared message container
--------------------------*/
let messageContainer = null;

export function getMessageContainer() {
  return messageContainer;
}

export function setMessageContainer(el) {
  messageContainer = el;
}

/* -------------------------
   Internal helpers
--------------------------*/
function ensureRenderedSet(chatid) {
  let set = renderedIdsMap.get(chatid);
  if (!set) {
    set = new Set();
    renderedIdsMap.set(chatid, set);
  }
  return set;
}

function normalizeId(msg) {
  return String(msg.messageid || msg.id);
}

/* -------------------------
   Mount message
--------------------------*/
export function mountMessage(msg, { pending = false } = {}) {
  const container =
    getMessageContainer() || document.querySelector(".chat-messages");
  if (!container) return null;

  const id = normalizeId(msg);
  const domId = `msg-${id}`;

  if (document.getElementById(domId)) return null;

  const node = renderMessage({ ...msg, pending });
  node.id = domId;

  if (pending) {
    node.style.opacity = "0.5";
    node.setAttribute("data-pending", "1");
  }

  container.appendChild(node);
  try {
    container.scrollTop = container.scrollHeight;
  } catch {}

  return node;
}

/* -------------------------
   Exports
--------------------------*/
export { ChatState, pendingMap, renderedIdsMap, renderMessage };

/* -------------------------
   WebSocket utils
--------------------------*/
function wsUrl() {
  const token = getState("token");
  let url = MERE_WS.replace(/^http/, "ws") + "/ws/merechat";
  if (token) url += `?token=${encodeURIComponent(token)}`;
  return url;
}

export function closeExistingSocket(reason = "") {
  const ws = ChatState.getSocket();
  if (ws) {
    try { ws.close(); } catch {}
    ChatState.setSocket(null);
  }
  ChatState.resetReconnectAttempts();
  if (reason) console.log("WS closed:", reason);
}

/* -------------------------
   WebSocket connection
--------------------------*/
let reconnectTimer = null;

export function connectWebSocket() {
  const existing = ChatState.getSocket();
  if (
    existing &&
    (existing.readyState === WebSocket.OPEN ||
      existing.readyState === WebSocket.CONNECTING)
  ) return;

  clearTimeout(reconnectTimer);

  let socket;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ChatState.setSocket(socket);

  socket.onopen = () => {
    ChatState.resetReconnectAttempts();

    const token = getState("token");
    if (token) {
      socket.send(JSON.stringify({ type: "presence", online: true }));
    }

    const chatid = ChatState.getChatId();
    if (chatid) {
      socket.send(JSON.stringify({ type: "join", chatid }));
    }
  };

  socket.onmessage = ev => {
    let data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleWSMessage(data);
  };

  socket.onerror = () => {
    socket.close();
  };

  socket.onclose = () => {
    ChatState.setSocket(null);
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  const attempts = ChatState.getReconnectAttempts();
  const delay = Math.min(30000, 1000 * Math.pow(2, attempts));
  ChatState.incrementReconnectAttempts();
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectWebSocket, delay);
}

/* -------------------------
   Handle WS messages
--------------------------*/
function handleWSMessage(data) {
  if (!data?.type) return;

  switch (data.type) {
    case "message": {
      const chatid = data.chatid;
      if (!chatid) return;

      // ignore messages for inactive chat
      if (chatid !== ChatState.getChatId()) return;

      const serverId = String(data.messageid);
      const rendered = ensureRenderedSet(chatid);

      // reconcile optimistic
      if (data.clientId && pendingMap.has(data.clientId)) {
        const pending = pendingMap.get(data.clientId);
        if (pending.chatid === chatid && pending.el) {
          pending.el.id = `msg-${serverId}`;
          pending.el.style.opacity = "1";
          pending.el.removeAttribute("data-pending");
        }
        pendingMap.delete(data.clientId);
        rendered.add(serverId);
        return;
      }

      if (rendered.has(serverId)) return;

      mountMessage(data);
      rendered.add(serverId);
      break;
    }

    case "typing":
      // UI hook
      break;

    case "presence":
      // online/offline hook
      break;

    /* future:
       case "reaction"
       case "edit"
       case "read"
    */
  }
}
