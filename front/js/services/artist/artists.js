import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../home/homeHelpers.js";

// ---------- ARTISTS PAGE ----------
export async function displayArtists(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "artists-page" });
  const aside = createElement("aside", { class: "artists-aside" });
  const main = createElement("div", { class: "artists-main" });
  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(createElement("h2", {}, ["Actions"]));

  if (isLoggedIn) {
    aside.append(
      Button("Create Artist", "", { click: () => navigate("/create-artist") }, "buttonx primary")
    );
  }

  aside.append(adspace("aside"));

  // ---------- TITLE ----------
  main.append(createElement("h1", {}, ["Artists"]));

  // ---------- FILTERS ----------
  const filterContainer = createElement("div", { class: "top-controls" });
  const searchInput = createElement("input", { type: "text", placeholder: "Search by name...", class:"sort-box" });
  const categorySelect = createElement("select", {class:"sort-box"}, [
    createElement("option", { value: "" }, ["All Categories"])
  ]);
  filterContainer.append(searchInput, categorySelect);
  main.append(filterContainer);

  // ---------- BODY AD ----------
  main.append(adspace("inbody"));

  // ---------- FETCH ARTISTS ----------
  let allArtists = [];
  try {
    const resp = await apiFetch("/artists?offset=0&limit=5000");
    allArtists = Array.isArray(resp) ? resp : resp?.data || resp?.artists || [];
  } catch (err) {
    console.error("Failed to load artists", err);
  }

  // Populate category select
  const categories = [...new Set(allArtists.map(a => a.category).filter(Boolean))];
  categories.forEach(cat => categorySelect.append(createElement("option", { value: cat }, [cat])));

  // ---------- LIST ----------
  const list = createElement("div", { class: "artists-list" });
  main.append(list);

  let currentPage = 1;
  const pageSize = 10;

  function paginate(items, page) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderArtists(filtered) {
    list.replaceChildren();
    const paged = paginate(filtered, currentPage);

    if (!paged.length) {
      list.append(createElement("p", {}, ["No artists found."]));
      return;
    }

    paged.forEach((artist, idx) => {
      list.append(createArtistCard(artist));
      if ((idx + 1) % 6 === 0) {
list.append(adspace("inlist"));
}
    });

    // ---------- PAGINATION ----------
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (totalPages > 1) {
      const pager = createElement("div", { class: "artists-pager" });

      if (currentPage > 1) {
        pager.append(Button("Prev", "", { click: () => {
 currentPage--; renderArtists(filtered); 
} }, "buttonx secondary"));
      }

      if (currentPage < totalPages) {
        pager.append(Button("Next", "", { click: () => {
 currentPage++; renderArtists(filtered); 
} }, "buttonx secondary"));
      }

      list.append(pager);
    }
  }

  // ---------- FILTER LOGIC ----------
  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const category = categorySelect.value;

    const filtered = allArtists.filter(a => {
      const matchesKeyword = a.name?.toLowerCase().includes(keyword);
      const matchesCategory = !category || a.category === category;
      return matchesKeyword && matchesCategory;
    });

    currentPage = 1;
    renderArtists(filtered);
  }

  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);

  // Initial render
  renderArtists(allArtists);
}

// ---------- ARTIST CARD ----------
function createArtistCard(artist) {
  const imgSrc = artist.photo
    ? resolveImagePath(EntityType.ARTIST, PictureType.THUMB, artist.photo)
    : "";

  return createElement("div", { class: "artist-card" }, [
    Imagex({ src: imgSrc, alt: artist.name || "Unnamed Artist", classes: "artist-thumb" }),
    createElement("h3", {}, [artist.name || "Unnamed"]),
    createElement("p", { class: "artist-category" }, [artist.category || "-"]),
    createElement("p", { class: "artist-bio" }, [
      ((artist.bio || "") + "").substring(0, 100) + ((artist.bio || "").length > 100 ? "..." : "")
    ]),
    Button("View Details", `view-${artist.artistid}`, {
      click: () => navigate(`/artist/${artist.artistid}`)
    }, "artist-view-btn")
  ]);
}
