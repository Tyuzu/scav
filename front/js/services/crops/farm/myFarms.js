import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";
import { renderFarmCards } from "./farmListHelpers.js";

export async function displayMyFarm(container) {
  container.replaceChildren();

  const page = createElement("div", { class: "my-farms-page" }, [
    createElement("h2", {}, ["My Farms"])
  ]);

  const grid = createElement("div", { class: "farm__grid" });

  page.append(grid);
  container.append(page);

  try {
    const res = await apiFetch("/farms/my");
    const farms = Array.isArray(res?.farms) ? res.farms : [];

    if (!farms.length) {
      grid.append(
        createElement("p", {}, ["You do not own any farms yet."])
      );
      return;
    }

    renderFarmCards(
      farms,
      grid,
      true,      // logged in
      () => {}   // favorite handler (optional)
    );
  } catch {
    grid.append(
      createElement("p", {}, ["Failed to load your farms."])
    );
  }
}