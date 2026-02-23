import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { createTabs } from "../../components/ui/createTabs.js";
import { subscribeDeep } from "../../state/state.js";

export const clearElement = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

const categoryMap = {
  Places: EntityType.PLACE,
  Events: EntityType.EVENT,
  Baitos: EntityType.BAITO,
  Products: EntityType.PRODUCT,
  Posts: EntityType.POST
};
const getEntityByCategory = (category) => categoryMap[category];

function createImageCard({ banner, title, description, href }, entitytype) {
  const safeTitle = title || "Untitled";
  const imgSrc = resolveImagePath(entitytype, PictureType.THUMB, banner);

  const card = createElement(
    "div",
    { class: "image-card", role: "button", tabIndex: 0, "aria-label": `Open ${safeTitle}` },
    [
      Imagex({ src: imgSrc, alt: safeTitle }),
      createElement("div", { class: "card-info" }, [
        createElement("h4", {}, [safeTitle]),
        createElement("p", {}, [description || ""]),
        Button("Explore", "button", { click: (e) => { e.stopPropagation(); navigate(href); } }, "card-link")
      ])
    ]
  );

  card.addEventListener("click", () => navigate(href));
  card.addEventListener("keypress", (e) => {
    if (e.key === "Enter" || e.key === " ") navigate(href);
  });

  return card;
}

// -------------------- Pagination + Cards --------------------
function createCardSection() {
  const cardGrid = createElement("div", { class: "card-grid" }, []);
  const loadMoreWrapper = createElement("div", { class: "load-more-wrap" }, []);
  const pagingState = {};
  const DEFAULT_LIMIT = 20;

  const fetchPage = async (category, skip, limit) =>
    apiFetch(`/homecards?category=${encodeURIComponent(category)}&skip=${skip}&limit=${limit}`);

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
      cardGrid.append(showMessage("Loading..."));
    } else {
      loadMoreWrapper.setAttribute("data-loading", "true");
    }

    try {
      const data = await fetchPage(category, state.skip, state.limit);

      if (initial) clearElement(cardGrid);
      loadMoreWrapper.removeAttribute("data-loading");

      if (!data?.length) {
        if (initial) cardGrid.append(showMessage("No results found."));
        state.done = true;
        clearElement(loadMoreWrapper);
        return;
      }

      const fragment = document.createDocumentFragment();
      data.forEach((c) =>
        fragment.append(createImageCard(c, getEntityByCategory(category)))
      );
      cardGrid.append(fragment);

      state.skip += data.length;

      clearElement(loadMoreWrapper);
      if (data.length === state.limit) loadMoreWrapper.append(makeLoadMoreButton(category));
      else state.done = true;
    } catch {
      if (initial) {
        clearElement(cardGrid);
        cardGrid.append(showMessage("Failed to load cards."));
      }
    } finally {
      state.loading = false;
    }
  };

  return { cardGrid, loadMoreWrapper, renderCardsPage, pagingState };
}

// -------------------- MAIN: Tabs + Reactive Update --------------------
export function createListingTabs() {
  const wrapper = createElement("div", { class: "listing-tabs-wrapper" }, []);

  function render() {
    wrapper.replaceChildren();

    const categories = Object.keys(categoryMap);

    const tabs = categories.map((id) => ({
      id,
      title: id,
      render: (container) => {
        const section = createCardSection();
        container.append(section.cardGrid, section.loadMoreWrapper);
        section.renderCardsPage(id, true);
      }
    }));

    wrapper.append(createTabs(tabs, "homeTabs", "Places"));
  }

  subscribeDeep("token", render);
  subscribeDeep("userProfile.role", render);

  render();

  return wrapper;
}
