// i18n.js
const dict = {
  /* -------------------------
     Auth / state
  --------------------------*/
  "chat.login_prompt": "🔒 Please log in to use chat.",
  "chat.online":       "Online",
  "chat.offline":      "Offline",

  /* -------------------------
     Chat list / navigation
  --------------------------*/
  "chat.new_chat":       "➕ New Chat",
  "chat.start":          "Start",
  "chat.no_chats":       "No chats found",
  "chat.load_error":     "Failed to load chats",
  "chat.search":         "Search…",

  /* -------------------------
     Chat view / messages
  --------------------------*/
  "chat.type_message":   "Type a message…",
  "chat.send":           "Send",
  "chat.typing":         "typing…",
  "chat.message_failed": "Message failed to send",
  "chat.message_deleted":"Message deleted",
  "chat.message_edited": "Edited",

  /* -------------------------
     Participants
  --------------------------*/
  "chat.placeholder_ids":"Comma-separated user IDs",
  "chat.with":          "Chat with",
  "chat.you":           "You",

  /* -------------------------
     Uploads / media
  --------------------------*/
  "chat.upload":            "📎",
  "chat.uploading":         "Uploading…",
  "chat.upload_failed":     "Upload failed",
  "chat.unsupported_file": "Unsupported file type",

  /* -------------------------
     Presence / system
  --------------------------*/
  "chat.system":        "System",
  "chat.joined":        "joined the chat",
  "chat.left":          "left the chat",

  /* -------------------------
     Accessibility
  --------------------------*/
  "chat.back":          "Back",
  "chat.loading":       "Loading…"
};

export function t(key) {
  return dict[key] || key;
}
