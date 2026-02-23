import Button from "../../../components/base/Button.js";
import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";
import {
  renderFarmCards,
  renderFeaturedFarm,
  renderCTAFarm,
  renderWeatherWidget,
  renderFarmStats,
} from "./farmListHelpers.js";
import {
  createFilterControls,
  applyFiltersAndSort
} from "./farmFilters.js";

// Config
const PAGE_SIZE = 10;

// State
const state = {
  farms: [],
  page: 1,
  isLoading: false,
  hasMore: true,
  favorites: new Set(JSON.parse(localStorage.getItem("favFarms") || "[]")),
  searchKeyword: "",
  locationFilter: "",
  onlyAvailable: false,
  minRating: 0,
  maxRating: 5,
  sortBy: "",
  sortDir: ""
};

// ---------- Data helpers ----------

function indexFarmsById(farms) {
  const map = new Map();
  farms.forEach(f => map.set(String(f.id), f));
  return map;
}

function getTopRated(farms, limit = 3) {
  return farms
    .filter(f => typeof f.rating === "number")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

// ---------- API ----------

async function fetchFarms(page) {
  try {
    const res = await apiFetch(`/farms?page=${page}&limit=${PAGE_SIZE}`);
    if (!res || !Array.isArray(res.farms)) return [];
    return res.farms;
  } catch {
    return [];
  }
}

// ---------- Grid ----------

function Grid(isLoggedIn, toggleFavorite) {
  const container = createElement("div", { class: "farm__grid" });

  return {
    container,
    render(farms) {
      container.replaceChildren();

      if (!farms.length) {
        container.append(
          createElement("p", {}, ["No farms found."])
        );
        return;
      }

      renderFarmCards(farms, container, isLoggedIn, toggleFavorite);
    }
  };
}

// ---------- Sidebar ----------

function Sidebar(isLoggedIn, stateRef) {
  const container = createElement("div", { class: "farm__sidebar" });

  const staticSections = createElement("div");
  const dynamicSections = createElement("div");

  renderCTAFarm(staticSections);
  renderWeatherWidget(staticSections);
  renderMap(staticSections);

  container.append(staticSections, dynamicSections);

  function renderFavorites(container) {
    if (!isLoggedIn) return;

    const farmIndex = indexFarmsById(stateRef.farms);
    const section = createElement("section", { class: "farm__favorites" }, [
      createElement("h3", {}, ["Favorites"])
    ]);

    if (stateRef.favorites.size === 0) {
      section.append(
        createElement("p", {}, ["None yet. Click ❤ on a card."])
      );
    } else {
      const list = createElement("ul");
      stateRef.favorites.forEach(id => {
        const farm = farmIndex.get(String(id));
        if (farm) {
          list.append(
            createElement("li", {}, [farm.name])
          );
        }
      });
      section.append(list);
    }

    container.append(section);
  }

  function renderRatings(container, farms) {
    const section = createElement("section", { class: "farm__ratings" }, [
      createElement("h3", {}, ["Top Rated"])
    ]);

    const top = getTopRated(farms);

    if (!top.length) {
      section.append(
        createElement("p", {}, ["No ratings yet."])
      );
    } else {
      top.forEach(f => {
        const rounded = Math.round(f.rating);
        const stars =
          "★".repeat(rounded) +
          "☆".repeat(5 - rounded);

        section.append(
          createElement("div", { class: "rating" }, [
            createElement("strong", {}, [f.name]),
            createElement("span", {}, [stars])
          ])
        );
      });
    }

    container.append(section);
  }

  function renderMap(container) {
    container.append(
      createElement("section", { class: "farm__map" }, [
        createElement("h3", {}, ["Farm Map"]),
        createElement("div", { class: "farm__map-placeholder" }, [
          "Map integration point"
        ])
      ])
    );
  }

  return {
    container,
    render(farms) {
      dynamicSections.replaceChildren();

      if (farms.length) {
        renderFeaturedFarm(dynamicSections, farms[0]);
      }

      renderFarmStats(dynamicSections, farms);
      renderFavorites(dynamicSections);
      renderRatings(dynamicSections, farms);
    }
  };
}

// ---------- Main entry ----------

export async function displayFarms(content, loggedIn) {
  content.replaceChildren();

  const container = createElement("div", { class: "farmspage" });
  content.append(container);

  const layout = createElement("div", { class: "farm-page" });
  const main = createElement("div", { class: "farm__main" });
  const side = createElement("aside", { class: "farm__side" });

  const layoutInner = createElement(
    "div",
    { class: "farm__layout" },
    [main, side]
  );

  layout.append(layoutInner);
  container.append(layout);

  const sentinel = createElement("div", { class: "farm__sentinel" });

  const grid = Grid(loggedIn, toggleFavorite);
  const sidebar = Sidebar(loggedIn, state);

  function commit() {
    const visible = applyFiltersAndSort(state.farms, state);
    grid.render(visible);
    sidebar.render(visible);
  }

  const filters = createFilterControls(state, commit);

  main.append(filters, grid.container, sentinel);
  side.append(sidebar.container);

  const observer = new IntersectionObserver(onIntersect, {
    rootMargin: "200px"
  });

  observer.observe(sentinel);

  await loadNextPage();
  commit();

  async function loadNextPage() {
    if (state.isLoading || !state.hasMore) return;

    state.isLoading = true;
    const batch = await fetchFarms(state.page);

    if (batch.length) {
      state.farms.push(...batch);
      state.page += 1;
    } else {
      state.hasMore = false;
      observer.disconnect();
    }

    state.isLoading = false;
  }

  async function onIntersect(entries) {
    if (!entries.some(e => e.isIntersecting)) return;

    const prevCount = state.farms.length;
    await loadNextPage();

    if (state.farms.length !== prevCount) {
      commit();
    }
  }

  function toggleFavorite(farmId) {
    const id = String(farmId);

    if (state.favorites.has(id)) {
      state.favorites.delete(id);
    } else {
      state.favorites.add(id);
    }

    localStorage.setItem(
      "favFarms",
      JSON.stringify(Array.from(state.favorites))
    );

    commit();
  }
}
