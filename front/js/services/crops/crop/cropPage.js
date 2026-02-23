import { createUserControls } from "../farm/displayFarmHelpers.js";
import NoLink from "../../../components/base/NoLink";
import { createElement } from "../../../components/createElement";
import { apiFetch } from "../../../api/api";
import { navigate } from "../../../routes";
import Imagex from "../../../components/base/Imagex";
import { resolveImagePath, PictureType, EntityType } from "../../../utils/imagePaths.js";
import Notify from "../../../components/ui/Notify.mjs";
import Button from "../../../components/base/Button.js";

export async function displayCrop(content, cropID, isLoggedIn) {
  const container = createElement("div", { class: "croppage" });
  content.replaceChildren(container);

  try {
    const resp = await apiFetch(`/crops/crop/${cropID}?page=1&limit=100`);
    if (!resp.success || !Array.isArray(resp.listings) || resp.listings.length === 0) {
      Notify("No listings found for this crop.", { type: "error", dismissible: true });
      return;
    }

    const listings = resp.listings;

    // Header
    const header = createElement("header", { class: "crop-header" }, [
      NoLink(`${resp.name} (${resp.category})`, "", {
        click: () => navigate(`/aboutcrop/${cropID}`),
      }),
      createElement("p", { class: "crop-meta" }, [`Total Listings: ${resp.total}`]),
    ]);

    // Filter toggle button
    const toggleFiltersBtn = Button("Filters", "button", {}, "toggle-filters-btn buttonx");

    // Filter form inputs
    const filterForm = createElement(
      "form",
      { class: "filter-controls", "aria-label": "Filter crop listings" },
      [
        createElement("fieldset", {}, [
          createElement("legend", {}, ["Filters"]),
          ...[
            { id: "filter-location", label: "Location", type: "text", placeholder: "e.g. Nagoya" },
            { id: "filter-breed", label: "Breed", type: "text", placeholder: "e.g. Koshihikari" },
            { id: "filter-min-price", label: "Price Range (¥/kg)", type: "number", placeholder: "Min", min: 0 },
            { id: "filter-max-price", label: "", type: "number", placeholder: "Max", min: 0 },
            { id: "filter-min-qty", label: "Available Quantity (Kg)", type: "number", placeholder: "Min", min: 0 },
            { id: "filter-max-qty", label: "", type: "number", placeholder: "Max", min: 0 },
            { id: "filter-harvest", label: "Harvest Date", type: "date" },
          ].map((f, i, arr) => {
            const children = [createElement("label", { for: f.id }, [f.label || ""])];
            children.push(createElement("input", { type: f.type, id: f.id, placeholder: f.placeholder, min: f.min }));
            return createElement("div", { class: "filter-row" }, children);
          }),
        ]),
        createElement("div", { class: "filter-actions" }, [
          createElement("button", { type: "button", id: "apply-filters" }, ["Apply"]),
          createElement("button", { type: "button", id: "reset-filters" }, ["Reset"]),
        ]),
      ]
    );

    const listingsWrapper = createElement("section", { class: "crop-listings" });

    // Render listings
    const renderListings = (data) => {
      listingsWrapper.replaceChildren();
      if (!data || data.length === 0) {
        listingsWrapper.appendChild(createElement("p", {}, ["No listings match the selected filters."]));
        return;
      }

      data.forEach((listing) => {
        const imageSrc = resolveImagePath(EntityType.CROP, PictureType.THUMB, listing.banner);
        const farmName = listing.farmName || "Unnamed Farm";

        const imageSection = createElement("div", { class: "listing-image" }, [
          Imagex({ src: imageSrc, alt: listing.breed || farmName, loading: "lazy" }),
        ]);

        const detailsSection = createElement("div", { class: "listing-details" }, [
          createElement("h3", { class: "farm-link" }, [
            createElement("a", { events: { click: () => navigate(`/farm/${listing.farmid}`) } }, [farmName]),
          ]),
          createElement("p", {}, [`Breed: ${listing.breed || "Not specified"}`]),
          createElement("p", {}, [`Location: ${listing.location || "Unknown"}`]),
          createElement("p", {}, [`Price per Kg: ₹${listing.pricePerKg ?? "N/A"}`]),
          createElement("p", {}, [`Available: ${listing.availableQtyKg ?? "N/A"} Kg`]),
          createElement("p", {}, [
            `Harvest Date: ${
              listing.harvestDate ? new Date(listing.harvestDate).toLocaleDateString() : "N/A"
            }`,
          ]),
        ]);

        const cropData = {
          name: resp.name,
          cropid: listing.cropid,
          pricePerKg: listing.pricePerKg,
          unit: "kg",
          breed: listing.breed,
        };

        const controls = createUserControls(
          cropData,
          farmName,
          listing.farmid,
          isLoggedIn,
          listing.availableQtyKg,
          listing.cropid
        );

        const controlsSection = createElement("div", { class: "listing-controls" }, controls);

        const card = createElement("div", { class: "listing-card" }, [
          imageSection,
          createElement("div", { class: "listing-content" }, [detailsSection, controlsSection]),
        ]);

        listingsWrapper.appendChild(card);
      });
    };

    renderListings(listings);

    // Cached inputs
    const inputs = {
      location: document.getElementById("filter-location"),
      breed: document.getElementById("filter-breed"),
      minPrice: document.getElementById("filter-min-price"),
      maxPrice: document.getElementById("filter-max-price"),
      minQty: document.getElementById("filter-min-qty"),
      maxQty: document.getElementById("filter-max-qty"),
      harvestDate: document.getElementById("filter-harvest"),
    };

    const applyFilters = () => {
      const filters = {
        location: inputs.location.value.trim().toLowerCase(),
        breed: inputs.breed.value.trim().toLowerCase(),
        minPrice: parseFloat(inputs.minPrice.value) || null,
        maxPrice: parseFloat(inputs.maxPrice.value) || null,
        minQty: parseFloat(inputs.minQty.value) || null,
        maxQty: parseFloat(inputs.maxQty.value) || null,
        harvestDate: inputs.harvestDate.value || null,
      };

      if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
        Notify("Invalid price range (min > max).", { type: "warning", dismissible: true });
        return;
      }
      if (filters.minQty && filters.maxQty && filters.minQty > filters.maxQty) {
        Notify("Invalid quantity range (min > max).", { type: "warning", dismissible: true });
        return;
      }

      const filtered = listings.filter((listing) => {
        const locationMatch = !filters.location || (listing.location || "").toLowerCase().includes(filters.location);
        const breedMatch = !filters.breed || (listing.breed || "").toLowerCase().includes(filters.breed);
        const priceMatch =
          (!filters.minPrice || listing.pricePerKg >= filters.minPrice) &&
          (!filters.maxPrice || listing.pricePerKg <= filters.maxPrice);
        const qtyMatch =
          (!filters.minQty || listing.availableQtyKg >= filters.minQty) &&
          (!filters.maxQty || listing.availableQtyKg <= filters.maxQty);
        const harvestMatch =
          !filters.harvestDate ||
          (listing.harvestDate &&
            new Date(listing.harvestDate).toISOString().split("T")[0] === filters.harvestDate);

        return locationMatch && breedMatch && priceMatch && qtyMatch && harvestMatch;
      });

      renderListings(filtered);
      filterForm.classList.remove("open");
    };

    const resetFilters = () => {
      filterForm.reset();
      renderListings(listings);
      filterForm.classList.remove("open");
    };

    toggleFiltersBtn.addEventListener("click", () => filterForm.classList.toggle("open"));
    filterForm.querySelector("#apply-filters").addEventListener("click", applyFilters);
    filterForm.querySelector("#reset-filters").addEventListener("click", resetFilters);
    filterForm.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFilters();
      }
    });

    container.append(header, toggleFiltersBtn, filterForm, listingsWrapper);
  } catch (err) {
    Notify(err.message || "Failed to load crop details.", { type: "error", dismissible: true });
  }
}
