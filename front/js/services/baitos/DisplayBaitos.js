import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../home/homeHelpers.js";
import { buildCard } from "./baitoslisting/JobCard.js";

export async function displayBaitos(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "baitos-page" });
  const aside = createElement("aside", { class: "baitos-aside" });
  const main = createElement("div", { class: "baitos-main" });
  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(createElement("h2", {}, ["Actions"]));

  if (isLoggedIn) {
    aside.append(
      Button("Create Baito", "ct-baito-btn", { click: () => navigate("/create-baito") }, "buttonx"),
      Button("See Dashboard", "see-dash-btn", { click: () => navigate("/baitos/dash") }, "buttonx"),
      Button("Create Baito Profile", "", { click: () => navigate("/baitos/create-profile") }, "buttonx secondary"),
      Button("Hire Workers", "", { click: () => navigate("/baitos/hire") }, "buttonx secondary")
    );
  }

  // Language selector
  const langSelect = createElement("select", { id: "lang-toggle" });
  ["EN", "JP"].forEach(lang =>
    langSelect.appendChild(createElement("option", { value: lang.toLowerCase() }, [lang]))
  );
  langSelect.value = localStorage.getItem("baito-lang") || "en";
  langSelect.addEventListener("change", e => {
    localStorage.setItem("baito-lang", e.target.value);
    navigate(window.location.pathname);
  });
  aside.appendChild(langSelect);
  aside.append(adspace("aside"));

  // ---------- TITLE ----------
  main.append(createElement("h1", {}, ["Baitos"]));
  
  // ---------- FILTERS ----------
  const filterContainer = createElement("div", { class: "baitos-filters" });
  const searchInput = createElement("input", { type: "text", placeholder: "Search jobs...", class:"sort-box" });
  filterContainer.append(searchInput);
  main.append(filterContainer);

  main.append(adspace("inbody"));

  // ---------- FETCH JOBS ----------
  let allJobs = [];
  try {
    const resp = await apiFetch("/baitos/latest");
    allJobs = Array.isArray(resp) ? resp : resp?.data || resp?.jobs || [];
  } catch (err) {
    console.error("Failed to load baitos", err);
  }

  // ---------- LIST ----------
  const list = createElement("div", { class: "baitos-list" });
  main.append(list);

  let currentPage = 1;
  const pageSize = 10;

  function paginate(items, page) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderJobs(filtered) {
    list.replaceChildren();
    const paged = paginate(filtered, currentPage);

    if (!paged.length) {
      list.append(createElement("p", {}, ["No jobs found."]));
      return;
    }

    paged.forEach((job, idx) => {
      list.append(buildCard(job));
      if ((idx + 1) % 6 === 0) list.append(adspace("inlist"));
    });

    // ---------- PAGINATION ----------
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (totalPages > 1) {
      const pager = createElement("div", { class: "baitos-pager" });

      if (currentPage > 1) {
        pager.append(Button("Prev", "", { click: () => { currentPage--; renderJobs(filtered); } }, "buttonx secondary"));
      }

      if (currentPage < totalPages) {
        pager.append(Button("Next", "", { click: () => { currentPage++; renderJobs(filtered); } }, "buttonx secondary"));
      }

      list.append(pager);
    }
  }

  // ---------- FILTER LOGIC ----------
  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const filtered = allJobs.filter(job => (job.title || "").toLowerCase().includes(keyword));
    currentPage = 1;
    renderJobs(filtered);
  }

  searchInput.addEventListener("input", applyFilters);

  // Initial render
  renderJobs(allJobs);
}
