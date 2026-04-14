/* Hirer's Interface - View worker profile and book */
import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { navigate } from "../../../routes/index.js";
import Imagex from "../../../components/base/Imagex.js";
import { displayBooking } from "../../booking/booking.js";
import { getState } from "../../../state/state.js";
import { meChat } from "../../mechat/plugnplay.js";
import Notify from "../../../components/ui/Notify.mjs";

export async function displayWorkerProfile(contentContainer, isLoggedIn, workerId) {
  const container = createElement("div", { id: "worker-profile-page", class: "worker-profile-page" });
  container.appendChild(createElement("p", { class: "loading-msg" }, ["⏳ Loading worker profile..."]));
  contentContainer.replaceChildren(container);

  let worker = null;
  try {
    worker = await apiFetch(`/baitos/worker/${workerId}`);
  } catch (e) {
    container.replaceChildren(
      createElement("p", { class: "error-msg" }, ["⚠️ Failed to load worker profile."])
    );
    return;
  }

  const layout = createElement("div", { class: "worker-profile-layout" });
  const main = createElement("div", { class: "worker-profile-main" });
  const aside = createElement("aside", { class: "worker-profile-aside" });

  const bookingContainer = createElement("div", { class: "booking-container" });
  const slots = await getSlots(worker.baitoUserId);

  // ===== HEADER =====
  const header = createElement("section", { class: "worker-profile-header card" }, [
    createWorkerPhoto(worker),
    createElement("div", { class: "worker-header-content" }, [
      createElement("h2", {}, [worker.name || "Unnamed Worker"]),
      createNextAvailability(slots),
      createElement("div", { class: "worker-header-actions" }, [
        renderHireAction(isLoggedIn, bookingContainer, worker)
      ])
    ])
  ]);

  // ===== DETAILS CARDS =====
  const detailCards = [
    createSectionCard("Contact", [
      renderDetail("📞", "Phone", worker.phone),
      renderDetail("✉️", "Email", worker.email),
      renderDetail("📍", "Location", worker.location)
    ]),
    createSectionCard("Professional", [
      renderDetail("🎯", "Roles", worker.preferredRoles),
      renderDetail("⭐", "Experience", worker.experience),
      renderDetail("🛠️", "Skills", worker.skills),
      renderDetail("💰", "Expected Wage", worker.expectedWage ? `${worker.expectedWage} ¥/hr` : null),
      renderDetail("💼", "Availability", worker.availability),
      renderDetail("🌐", "Languages", worker.languages)
    ]),
    worker.bio && createSectionCard("About", [createElement("p", {}, [worker.bio])])
  ].filter(Boolean);

  const documentsSection = createDocumentsSection(worker);
  const bookingSection = createSectionCard("Schedule", [bookingContainer]);

  main.replaceChildren(header, ...detailCards);
  if (documentsSection) main.appendChild(documentsSection);
  main.appendChild(bookingSection);

  // ===== SIDEBAR =====
  const sidebarItems = createSidebarActions(worker, isLoggedIn);
  aside.replaceChildren(
    createElement("h3", {}, ["Actions"]),
    createElement("ul", {}, sidebarItems.map(item => createElement("li", {}, [item]))),
    Button("← Back to List", "back-btn", { click: () => navigate("/baitos/hire") }, "secondary")
  );

  layout.append(main, aside);
  container.replaceChildren(layout);

  // Load booking widget
  displayBooking({ entityType: "worker", entityId: worker.baitoUserId, userId: getState("user") || "guest" }, bookingContainer);
}

// ===== HELPERS =====

async function getSlots(workerId) {
  try {
    const res = await apiFetch(`/bookings/slots?entityId=${workerId}`);
    return res.slots || [];
  } catch {
    return [];
  }
}

function createNextAvailability(slots) {
  if (!slots?.length) {
    return createElement("div", { class: "next-availability none" }, ["No upcoming slots"]);
  }

  const nextSlot = slots
    .filter(s => new Date(s.date) >= new Date())
    .sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`))[0];

  if (!nextSlot) {
    return createElement("div", { class: "next-availability none" }, ["No upcoming availability"]);
  }

  return createElement("div", { class: "next-availability" }, [
    createElement("strong", {}, ["Next available:"]),
    createElement("span", {}, [` ${nextSlot.date} at ${nextSlot.start}`])
  ]);
}

function renderHireAction(isLoggedIn, bookingContainer, worker) {
  if (!isLoggedIn) {
    return createElement("p", { class: "login-msg" }, ["🔒 Login to book"]);
  }

  return Button("Book Now", "hire-btn", {
    click: () => bookingContainer.scrollIntoView({ behavior: "smooth" })
  }, "primary");
}

function createSectionCard(title, children) {
  return createElement("div", { class: "profile-section card" }, [
    createElement("h3", {}, [title]),
    ...children.filter(Boolean)
  ]);
}

function renderDetail(icon, label, value) {
  if (!value) return null;
  return createElement("div", { class: "detail-row" }, [
    icon + " ",
    `${label}: `,
    Array.isArray(value) ? value.join(", ") : value
  ]);
}

function createWorkerPhoto(worker) {
  return Imagex({
    src: resolveImagePath(EntityType.WORKER, PictureType.PHOTO, worker.profilePic),
    alt: worker.name,
    classes: "worker-profile-photo"
  });
}

function createDocumentsSection(worker) {
  if (!worker.documents?.length) return null;

  return createSectionCard("Documents", [
    createElement("ul", { class: "document-list" }, worker.documents.map((doc, i) =>
      createElement("li", {}, [
        createElement("a", {
          href: resolveImagePath(EntityType.WORKER, PictureType.DOCUMENT, doc),
          target: "_blank"
        }, [`📄 Document ${i + 1}`])
      ])
    ))
  ]);
}

function createSidebarActions(worker, isLoggedIn) {
  const items = [];

  items.push(
    Button("💬 Message", "", {
      click: () => {
        if (!isLoggedIn) {
          Notify("Login required", { type: "warning" });
          return;
        }
        meChat(worker.userId, "worker", worker.baitoUserId);
      }
    }, "secondary")
  );

  items.push(
    Button("⭐ Save", "", {
      click: () => {
        const fav = JSON.parse(localStorage.getItem("favoriteWorkers") || "[]");
        if (!fav.includes(worker.baitoUserId)) {
          fav.push(worker.baitoUserId);
          localStorage.setItem("favoriteWorkers", JSON.stringify(fav));
        }
        Notify("Added to favorites!", { type: "success" });
      }
    }, "secondary")
  );

  return items;
}
