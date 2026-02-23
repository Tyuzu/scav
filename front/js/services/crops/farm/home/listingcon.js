// listingcon.js
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { createTabs } from "../../components/ui/createTabs.js";

export const clearElement = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

// 🔗 Category → EntityType mapping
const categoryMap = {
  Places: EntityType.PLACE,
  Events: EntityType.EVENT,
  Baitos: EntityType.BAITO,
  Products: EntityType.PRODUCT,
  Posts: EntityType.POST,
};
const getEntityByCategory = (category) => categoryMap[category];

// 🖼️ Image Card
function createImageCard({ banner, title, description, href }, entitytype) {
  const bannerURL = resolveImagePath(entitytype, PictureType.THUMB, banner);
  const safeTitle = title || "Untitled";

  const card = createElement("div", {
    class: "image-card",
    role: "article",
    "aria-label": safeTitle,
  }, [
    Imagex({ src: bannerURL, alt: safeTitle }),
    createElement("div", { class: "card-info" }, [
      createElement("h4", {}, [safeTitle]),
      createElement("p", {}, [description || ""]),
      createElement("button", {
        class: "card-link",
        type: "button",
        "aria-label": `Open ${safeTitle}`,
      }, ["Explore"]),
    ]),
  ]);

  const linkBtn = card.querySelector(".card-link");
  if (linkBtn) linkBtn.addEventListener("click", () => navigate(href));

  return card;
}

// 🗂️ Cards + pagination
function createCardSection() {
  const cardGrid = createElement("div", { class: "card-grid" });
  const loadMoreWrapper = createElement("div", { class: "load-more-wrap" });

  const pagingState = {};
  const DEFAULT_LIMIT = 20;

  const fetchPage = async (category, skip, limit) => {
    const url = `/homecards?category=${encodeURIComponent(category)}&skip=${skip}&limit=${limit}`;
    return apiFetch(url);
  };

  const showMessage = (msg) => createElement("p", { class: "status-message" }, [msg]);

  const makeLoadMoreButton = (category) =>
    Button("Load more", "home-load-more", { click: () => renderCardsPage(category, false) }, "load-more-btn");

  const renderCardsPage = async (category, initial = false) => {
    if (!pagingState[category]) {
      pagingState[category] = { skip: 0, limit: DEFAULT_LIMIT, done: false, loading: false };
    }
    const state = pagingState[category];
    if (state.loading || state.done) return;

    state.loading = true;

    if (initial) {
      clearElement(cardGrid);
      cardGrid.appendChild(showMessage("Loading..."));
    } else {
      loadMoreWrapper.setAttribute("data-loading", "true");
    }

    try {
      const data = await fetchPage(category, state.skip, state.limit);

      if (initial) clearElement(cardGrid);
      loadMoreWrapper.removeAttribute("data-loading");

      if (!data || !data.length) {
        if (initial) cardGrid.appendChild(showMessage("No results found."));
        state.done = true;
        clearElement(loadMoreWrapper);
        return;
      }

      data.forEach((c) => cardGrid.appendChild(createImageCard(c, getEntityByCategory(category))));
      state.skip += data.length;

      clearElement(loadMoreWrapper);
      if (data.length === state.limit) {
        loadMoreWrapper.appendChild(makeLoadMoreButton(category));
      } else {
        state.done = true;
      }
    } catch {
      if (initial) {
        clearElement(cardGrid);
        cardGrid.appendChild(showMessage("Failed to load cards."));
      }
    } finally {
      state.loading = false;
    }
  };

  return { cardGrid, loadMoreWrapper, renderCardsPage, pagingState };
}

// 🔄 Use createTabs for listings
export function createListingTabs() {
  const categories = Object.keys(categoryMap);

  const tabs = categories.map((id) => ({
    id,
    title: id,
    render: (container) => {
      const section = createCardSection();
      container.appendChild(section.cardGrid);
      container.appendChild(section.loadMoreWrapper);
      section.renderCardsPage(id, true);
    },
  }));

  return createTabs(tabs, "homeTabs", "Places");
}
