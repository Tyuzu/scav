import { getState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { renderPlaceDetails } from "./renderPlaceDetails.js";
import { displayMedia } from "../media/ui/mediaGallery.js";
import { displayReviews } from "../reviews/displayReviews.js";
import { persistTabs } from "../../utils/persistTabs.js";
import { displayPlaceInfo } from "./placeTabs.js";
import {
  displayPlaceNearby,
  displayPlaceMenu,
  displayPlaceRooms,
  displayPlaceFacilities,
  displayPlaceServices,
  displayPlaceProducts,
  displayPlaceExhibits,
  displayPlaceMembership,
  displayPlaceShows,
  displaySaloonSlots,
  displayPlaceEvents,
  displayPlaceDetailsFallback,
} from "./customTabs.js";
import { displayPlaceJobs } from "../jobs/jobs.js";
import Notify from "../../components/ui/Notify.mjs";
import { displayBooking } from "../booking/booking.js";
import Button from "../../components/base/Button.js";
import { displayPlacesMap } from "./placeRemap.js";

export default async function displayPlace(isLoggedIn, placeId, contentContainer) {
  if (!placeId || !contentContainer || !(contentContainer instanceof HTMLElement)) {
    console.error("Invalid arguments passed to displayPlace.");
    return;
  }

  try {
    const placeData = await apiFetch(`/places/place/${placeId}`);
    if (!placeData || typeof placeData !== "object") {
      throw new Error("Invalid place data received.");
    }

    const isCreator = isLoggedIn && getState("user") === placeData.createdBy;
    contentContainer.replaceChildren();

    // ─── Place Header Section ───────────────────────────────
    const headerSection = createElement("div", { class: "place-header" });
    const titleRow = createElement("div", { style: "display:flex;align-items:center;justify-content:space-between;" });
    const heading = createElement("h1", {}, [placeData.name || "Unnamed"]);
    titleRow.appendChild(heading);

    if (isCreator) {
      titleRow.appendChild(createElement("span", {
        style: "margin-left:8px;padding:2px 6px;background:#28a745;color:#fff;font-size:0.8rem;border-radius:4px;"
      }, ["Verified Owner"]));
    }

    const actions = createElement("div", { style: "display:flex;gap:8px;align-items:center;" });
    const bookmarked = getBookmarks().includes(placeId);
    const bookmarkBtn = createElement("button", {
      title: "Bookmark this place",
      onclick: () => {
        toggleBookmark(placeId);
        bookmarkBtn.textContent = getBookmarks().includes(placeId) ? "★" : "☆";
      },
      style: "font-size:20px;cursor:pointer;border:none;background:none;"
    }, [bookmarked ? "★" : "☆"]);

    const shareBtn = createElement("button", {
      title: "Share",
      onclick: () => {
        navigator.clipboard.writeText(location.href);
        Notify("Link copied to clipboard", { type: "success", duration: 3000, dismissible: true });
      },
      style: "cursor:pointer;font-size:16px;border:none;background:none;"
    }, ["🔗"]);

    const { lat, lng } = placeData.coordinates || {};
    if (lat && lng) {
      const mapBtn = createElement("a", {
        href: `https://maps.google.com/?q=${lat},${lng}`,
        target: "_blank",
        rel: "noopener noreferrer",
        title: "Open in Maps",
        style: "font-size:16px;text-decoration:none;"
      }, ["🗺️"]);
      actions.appendChild(mapBtn);
    }

    actions.appendChild(bookmarkBtn);
    actions.appendChild(shareBtn);
    titleRow.appendChild(actions);
    headerSection.appendChild(titleRow);
    contentContainer.appendChild(headerSection);

    // ─── Editable Details ─────────────────────────────────
    const editSection = createElement("div", { class: "detail-section vflex" });
    try {
      renderPlaceDetails(isLoggedIn, editSection, placeData, isCreator);
      contentContainer.appendChild(editSection);

      let maparea = createElement("div", {}, []);
      const mapButton = Button("Show Map", "showMapBtn", {
        click: () => {
          const mapElement = displayPlacesMap();
          maparea.appendChild(mapElement);
          mapButton.remove(); // optional: remove button after loading map
        }
      },"buttonx secondary");

      contentContainer.appendChild(mapButton);
      contentContainer.appendChild(maparea);
      // contentContainer.appendChild(displayPlacesMap());
    } catch (err) {
      console.warn("Failed to render edit section:", err);
    }

    // ─── Booking Section (uses existing component) ─────────
    const bookingContainer = createElement("div", { id: "place-booking" });
    editSection.appendChild(bookingContainer);


    const bookButton = Button("View Bookings", "booking-btn", {
      click: () => {
        displayBooking(
          {
            entityType: "place",
            entityId: placeId,
            entityCategory: placeData.category,
            userId: getState("user") || "guest",
            isAdmin: isCreator
          },
          bookingContainer
        );
      }
    }, "buttonx primary", { "margin-top": "16px", "padding": "8px 16px", "cursor": "pointer" });
    bookingContainer.appendChild(bookButton);



    // ─── Tabs Setup ─────────────────────────────────
    const tabs = [];

    tabs.push({
      title: "Info",
      id: "info-tab",
      render: (container) => {
        try { displayPlaceInfo(container, placeData, isCreator); }
        catch (err) { container.textContent = "Failed to load info."; console.warn(err); }
      },
    });

    const categoryRaw = placeData.category || "";
    const category = categoryRaw.trim().toLowerCase();

    const categoryTabs = {
      restaurant: () => displayPlaceMenu,
      café: () => displayPlaceMenu,
      cafe: () => displayPlaceMenu,
      hotel: () => displayPlaceRooms,
      park: () => displayPlaceFacilities,
      business: () => displayPlaceServices,
      shop: () => displayPlaceProducts,
      museum: () => displayPlaceExhibits,
      gym: () => displayPlaceMembership,
      theater: () => displayPlaceShows,
      saloon: () => displaySaloonSlots,
      arena: () => displayPlaceEvents,
    };

    if (categoryTabs[category]) {
      const tabName = category.charAt(0).toUpperCase() + category.slice(1);
      tabs.push({
        title: category === "cafe" || category === "café" ? "Menu" : tabName,
        id: `${category}-tab`,
        render: (container) => categoryTabs[category]()(container, placeId, isCreator, isLoggedIn)
      });
    } else {
      tabs.push({
        title: "Details",
        id: "details-tab",
        render: (container) => displayPlaceDetailsFallback(container, categoryRaw, placeId)
      });
    }

    tabs.push(
      {
        title: "Nearby",
        id: "nearby-tab",
        render: (container) => { try { displayPlaceNearby(container, placeId); } catch { container.textContent = "Nearby places unavailable."; } },
      },
      {
        title: "Gallery",
        id: "gallery-tab",
        render: (container) => { try { displayMedia(container, "place", placeId, isLoggedIn); } catch { container.textContent = "Gallery could not load."; } },
      },
      {
        title: "Reviews",
        id: "reviews-tab",
        render: (container) => { try { displayReviews(container, isCreator, isLoggedIn, "place", placeId); } catch { container.textContent = "Reviews unavailable."; } },
      },
    );

    // if (placeData.jobs) {
    tabs.push(
      {
        title: "Jobs",
        id: "jobs-tab",
        render: (container) => { try { displayPlaceJobs(container, isCreator, isLoggedIn, "place", placeId); } catch { container.textContent = "No jobs available."; } },
      },
    );
    // }

    persistTabs(contentContainer, tabs, `place-tabs:${placeId}`);

  } catch (err) {
    console.error("displayPlace error:", err);
    contentContainer.replaceChildren();
    contentContainer.appendChild(createElement("h1", {}, [`Error loading place: ${err.message}`]));
    Notify("Failed to load place details. Please try again later.", { type: "error", duration: 3000, dismissible: true });
  }
}

// ─── Bookmark Utility Functions ─────────────────────────────────────────
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem("bookmarked_places") || "[]"); } catch { return []; }
}

function toggleBookmark(placeId) {
  let bookmarks = getBookmarks();
  if (bookmarks.includes(placeId)) bookmarks = bookmarks.filter(id => id !== placeId);
  else bookmarks.push(placeId);
  localStorage.setItem("bookmarked_places", JSON.stringify(bookmarks));
}

