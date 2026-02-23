import { createElement } from "../../../components/createElement";
import { apiFetch } from "../../../api/api"; // fixed import
import { guessCategoryFromName } from "./displayCropshelpers";
import { renderCropInterface } from "./displayCropsUI";

export async function displayCrops(content, isLoggedIn) {
  const contentContainer = createElement("div", { class: "cropspage" });
  content.replaceChildren(contentContainer);

  contentContainer.appendChild(createElement("h2", {}, ["All Crops"]));

  let categorized = {};

  try {
    const response = await apiFetch("/crops/types");

    if (!response || typeof response !== "object") {
      throw new Error("Invalid response from server");
    }

    const { cropTypes } = response;
    if (!Array.isArray(cropTypes)) {
      throw new Error("`cropTypes` is not an array");
    }

    cropTypes.forEach(raw => {
      if (!raw.Name) return;

      // 🔑 normalize backend → frontend shape
      const crop = {
        name: raw.Name,
        minPrice: raw.MinPrice,
        maxPrice: raw.MaxPrice,
        availableCount: raw.AvailableCount,
        unit: raw.Unit,
        banner: raw.Banner || "placeholder.jpg",
        tags: [],
        seasonMonths: []
      };

      const category = guessCategoryFromName(crop.name);
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push(crop);
    });

  } catch (err) {
    console.error("Error fetching crops:", err);
    categorized["Error"] = [];
  }

  renderCropInterface(contentContainer, categorized);
}

