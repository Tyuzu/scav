import { chatFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { navigate } from "../../routes/index.js";
import { displayNewChat } from "./displayNewchat.js";
import { createElement } from "../../components/createElement.js";
import { makeDraggableScroll } from "../../components/dragnav.js";

export async function displayChats(contentContainer, isLoggedIn) {
  // Clear previous content
  while (contentContainer.firstChild) contentContainer.removeChild(contentContainer.firstChild);

  const wrapper = createElement("div", { class: "chat-wrapper" });

  // Sidebar
  const sidebar = createElement("div", { class: "chat-topbar" });
  const list = createElement("ul", { class: "chat-list" });
  sidebar.appendChild(list);
  makeDraggableScroll(list);

  // Chat view
  const chatView = createElement("div", { class: "chat-view" });

  wrapper.append(sidebar, chatView);
  contentContainer.appendChild(wrapper);

  try {
    const chats = await chatFetch("/api/v1/newchats/all");
    const currentUser = getState("user");

    if (!Array.isArray(chats) || chats.length === 0) {
      list.appendChild(createElement("li", { class: "no-chats" }, ["No chats found."]));
      return;
    }

    chats.forEach(chat => {
      const otherUser = chat.users.find(id => id !== currentUser) || "Unknown";
      const isRead = chat.readStatus?.[currentUser];
      const lastMsg = chat.lastMessage?.text || "No messages yet";
      const timestamp = chat.lastMessage?.timestamp
        ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      const li = createElement("li", {
        class: `chat-item ${isRead ? "" : "unread"}`,
        events: {
          click: () => {
            displayNewChat(chatView, chat.chatid, isLoggedIn, currentUser);
          }
        }
      });

      li.addEventListener("mouseenter", () => li.style.backgroundColor = "#f1f1f1");
      li.addEventListener("mouseleave", () => li.style.backgroundColor = "");

      const avatar = createElement("div", { class: "chat-avatar" }, [otherUser.charAt(0).toUpperCase()]);
      const info = createElement("div", { class: "chat-info" });
      const name = createElement("strong", { class: "chat-name" }, [otherUser]);
      const messagePreview = createElement("div", { class: "chat-preview" }, [lastMsg]);
      const time = createElement("div", { class: "chat-time" }, [timestamp]);

      info.append(name, messagePreview);
      li.append(avatar, info, time);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading chats:", err);
    list.appendChild(createElement("li", { class: "chat-error" }, ["Failed to load chats."]));
  }
}

export async function userNewChatInit(targetUserId) {
  try {
    const currentUserId = getState("user");
    if (!currentUserId || !targetUserId) throw new Error("Missing user IDs");

    const payload = { userA: currentUserId, userB: targetUserId };
    const data = await chatFetch("/api/v1/newchats/init", "POST", JSON.stringify(payload));

    if (!data?.chatid) throw new Error("Chat ID missing in response");

    navigate(`/newchat/${data.chatid}`);
  } catch (err) {
    console.error("Chat init error:", err);
    alert("Unable to start or find chat.");
  }
}
