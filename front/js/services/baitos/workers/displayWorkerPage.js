import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { navigate } from "../../../routes/index.js";
import Imagex from "../../../components/base/Imagex.js";
import { displayBooking } from "../../booking/booking.js";
import { getState } from "../../../state/state.js";
import { meChat } from "../../mechat/plugnplay.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import { displayCreateOrEditBaitoProfile } from "../create/createBaitoProfile.js";
import Notify from "../../../components/ui/Notify.mjs";

export function displayCreateBaitoProfile(isLoggedIn, contentContainer) {
  return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "create");
}

export function displayEditBaitoProfile(isLoggedIn, contentContainer, workerId) {
  return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "edit", workerId);
}

export async function displayWorkerPage(contentContainer, isLoggedIn, workerId) {
  const container = createElement("div", { id: "worker-profile-page" });
  const layout = createElement("div", { class: "worker-profile-layout hvflex" });
  const main = createElement("div", { class: "worker-profile-main" });
  const aside = createElement("aside", { class: "worker-profile-aside" });

  // Loading state
  main.appendChild(createElement("p", { class: "loading-msg" }, ["⏳ Loading worker profile..."]));
  layout.append(main, aside);
  container.appendChild(layout);
  contentContainer.replaceChildren(container);

  // Fetch worker
  let worker = null;
  try {
    worker = await apiFetch(`/baitos/worker/${workerId}`);
  } catch (e) {
    console.error("Failed to load worker profile", e);
    main.replaceChildren(
      createElement("p", { class: "error-msg" }, ["⚠️ Failed to load worker profile."])
    );
    return;
  }

  const isCreator = worker.userid == getState("user");

  // Header
  const header = createElement("div", { class: "worker-profile-header" }, [
    createElement("div", { class: "photocon" }, [createWorkerPhoto(worker, isCreator)]),
    createElement("h2", {}, [worker.name || "Unnamed Worker"])
  ]);

  // Details
  const details = createElement("div", { class: "worker-profile-details" }, [
    renderDetail("📞", "Phone", worker.phone_number),
    renderDetail("✉️", "Email", worker.email),
    renderDetail("🎯", "Roles", worker.preferred_roles || []),
    renderDetail("📍", "Location", worker.address),
    renderDetail("📝", "Bio", worker.bio),
    renderDetail("⭐", "Experience", worker.experience || "Not specified"),
    renderDetail("🛠️", "Skills", worker.skills || "Not specified"),
    renderDetail("💼", "Availability", worker.availability || "Unknown"),
    renderDetail("💰", "Expected Wage", worker.expected_wage ? `${worker.expected_wage} ¥/hr` : null),
    renderDetail("🌐", "Languages", worker.languages || "Not specified"),
  ].filter(Boolean));

  // Documents
  let documentsSection = null;
  if (worker.documents && worker.documents.length > 0) {
    documentsSection = createElement("div", { class: "worker-documents" }, [
      createElement("h3", {}, ["📂 Documents"]),
      createElement("ul", {}, worker.documents.map((doc, i) =>
        createElement("li", {}, [
          createElement("a", { href: resolveImagePath(EntityType.WORKER, PictureType.DOCUMENT, doc), target: "_blank" }, [`Document ${i + 1}`])
        ])
      ))
    ]);
  }

  // Booking Actions
  const bookingContainer = createElement("div", { class: "booking-container" });
  const actions = createElement("div", { class: "worker-profile-actions" }, [
    renderActions(worker, isLoggedIn, isCreator, bookingContainer),
    Button("Back to List", "back-btn", { click: () => navigate("/baitos/hire") }, "secondary")
  ]);

  main.replaceChildren(header, details);
  if (documentsSection) main.appendChild(documentsSection);
  main.append(actions, bookingContainer);

  // Sidebar
  const sidebarItems = renderSidebar(worker, isLoggedIn, isCreator);
  aside.replaceChildren(
    createElement("h3", {}, ["More Options"]),
    createElement("ul", {}, sidebarItems.map(item => createElement("li", {}, [item])))
  );

  // --- CREATOR EXTRAS ---
  if (isCreator) {
    const creatorSection = createElement("div", { class: "creator-section" }, [
      createElement("h3", {}, ["Manage Profile"]),
      Button("✏️ Edit Profile", "edit-profile-btn", {
        click: () => {
          contentContainer.replaceChildren();
          displayEditBaitoProfile(isLoggedIn, contentContainer, worker.baito_user_id);
        }
      }, "primary buttonx"),

      Button("🗑️ Delete Profile", "delete-profile-btn", {
        click: async () => {
          if (!window.confirm("Are you sure you want to delete this profile?")) return;
          try {
            Notify("Deleting profile...", { type: "info", duration: 2000, dismissible: true });
            await apiFetch(`/baitos/worker/${worker.baito_user_id}`, "DELETE");
            Notify("Profile deleted successfully.", { type: "success", duration: 3000, dismissible: true });
            navigate("/baitos/hire");
          } catch (err) {
            Notify(`Failed to delete profile: ${err.message || "Unknown error"}`, { type: "error", duration: 4000, dismissible: true });
          }
        }
      }, "danger buttonx"),

      createElement("h3", {}, ["Gallery Images"]),
      Button("➕ Add Image", "add-image-btn", {
        click: () => {
          updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "gallery",
            stateKey: "images",
            stateEntityKey: "worker",
            previewElementId: null,
            pictureType: PictureType.GALLERY,
            entityId: worker.baito_user_id
          });
        }
      }, "secondary button"),

      createElement("h3", {}, ["Upcoming Bookings"]),
      createElement("div", { id: "creator-bookings" }, ["⏳ Loading bookings..."])
    ]);

    main.appendChild(creatorSection);
    loadCreatorBookings(worker.baito_user_id, creatorSection.querySelector("#creator-bookings"));
  }
}

/* ---------- HELPERS ---------- */

function renderDetail(icon, label, value) {
  if (!value) return null;
  return createElement("div", { class: "detail-row" }, [
    createElement("span", { class: "detail-icon", "aria-hidden": "true" }, [icon]),
    createElement("span", { class: "detail-label" }, [label + ": "]),
    createElement("span", { class: "detail-value" }, [
      Array.isArray(value) ? value.join(", ") : value
    ])
  ]);
}

function renderActions(worker, isLoggedIn, isCreator, bookingContainer) {
  if (!isLoggedIn) {
    return createElement("p", { class: "login-msg" }, ["🔒 Login to hire"]);
  }
  return Button("Hire This Worker", "hire-btn", {
    click: () => {
      displayBooking(
        {
          entityType: "worker",
          entityId: worker.baito_user_id,
          entityCategory: worker.category,
          userId: getState("user") || "guest",
          isAdmin: isCreator
        },
        bookingContainer
      );
    }
  }, "primary");
}

function renderSidebar(worker, isLoggedIn, isCreator) {
  const items = [];
  if (!isCreator) {
    items.push(
      Button("Message Worker", "msg-btn", {
        click: () => {
          if (!isLoggedIn) {
            Notify("Login required to message.", { type: "warning", duration: 3000, dismissible: true });
            return;
          }
          meChat(worker.userid, "worker", worker.baito_user_id);
        }
      }, "buttonx")
    );
  }
  items.push(
    Button("Save to Favorites", "fav-btn", {
      click: () => {
        if (!isLoggedIn) {
          Notify("Login required to save favorites.", { type: "warning", duration: 3000, dismissible: true });
          return;
        }
        let favorites = JSON.parse(localStorage.getItem("favoriteWorkers") || "[]");
        if (!favorites.includes(worker.baito_user_id)) {
          favorites.push(worker.baito_user_id);
          localStorage.setItem("favoriteWorkers", JSON.stringify(favorites));
        }
        Notify("Worker saved to favorites!", { type: "success", duration: 2500, dismissible: true });
      }
    }, "buttonx")
  );
  return items;
}

function createWorkerPhoto(worker, isCreator) {
  const photoSection = createElement("div", { class: "worker-photo" });
  const photoSrc = resolveImagePath(EntityType.WORKER, PictureType.PHOTO, worker.photo);
  const photoImg = Imagex({
    id: "worker-avatar-img",
    src: photoSrc,
    alt: `${worker.name || "worker"}'s photo`,
    classes: "worker-profile-photo"
  });
  photoSection.appendChild(photoImg);

  if (isCreator) {
    const photoEditButton = createElement("button", { class: "edit-banner-pic" }, ["P"]);
    photoEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: EntityType.WORKER,
        imageType: "photo",
        stateKey: "photo",
        stateEntityKey: "worker",
        previewElementId: "worker-avatar-img",
        pictureType: PictureType.PHOTO,
        entityId: worker.baito_user_id
      });
    });
    photoSection.appendChild(photoEditButton);
  }
  return photoSection;
}

async function loadCreatorBookings(workerId, container) {
  try {
    const today = await apiFetch(`/bookings/slots`);
    const tomorrow = await apiFetch(`/bookings/bookings`);

    container.replaceChildren(
      createElement("h4", {}, ["Today"]),
      renderBookingList(today),
      createElement("h4", {}, ["Tomorrow"]),
      renderBookingList(tomorrow)
    );
  } catch (err) {
    container.replaceChildren(
      createElement("p", { class: "error-msg" }, ["⚠️ Failed to load bookings"])
    );
  }
}

function renderBookingList(bookings) {
  if (!bookings || bookings.length === 0) {
    return createElement("p", { class: "empty" }, ["No bookings"]);
  }
  return createElement("ul", { class: "booking-list" }, bookings.map(b =>
    createElement("li", {}, [
      `${b.clientName || "Client"} - ${b.time || "Unknown time"}`
    ])
  ));
}