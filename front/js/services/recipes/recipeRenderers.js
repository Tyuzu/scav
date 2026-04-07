import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { addToCart } from "../cart/addToCart.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Bannerx from "../../components/base/Bannerx.js";
import { createCommentsSection } from "../comments/comments.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";

// --- LocalStorage Helpers ---
export function getStepKey(recipeid) {
 return `completedSteps:${recipeid}`; 
}
export function getFavorites() {
 return JSON.parse(localStorage.getItem("favoriteRecipes") || "[]"); 
}

export function saveFavorite(recipeid, value) {
  let fav = getFavorites();
  fav = value ? [...new Set([...fav, recipeid])] : fav.filter(id => id !== recipeid);
  localStorage.setItem("favoriteRecipes", JSON.stringify(fav));
}

// --- Inline Edit Helper ---
export function makeInlineEditable(container, currentText, onSave) {
  const input = createElement("input", { type: "text", value: currentText });
  const saveBtn = Button("Save", "", {}, "tiny-button");
  const cancelBtn = Button("Cancel", "", {}, "tiny-button");

  container.replaceChildren(input, saveBtn, cancelBtn);

  saveBtn.addEventListener("click", () => {
    const newVal = input.value.trim();
    if (newVal) {
onSave(newVal);
}
  });

  cancelBtn.addEventListener("click", () => {
    container.replaceChildren(createElement("span", {}, [currentText]));
  });
}

// --- Author ---
export function renderAuthor(recipe, currentUser) {
  const container = createElement("p", { class: "author-info" }, ["Loading author..."]);

  fetchUserMeta([recipe.userId]).then(userx => {
    recipe.username = userx[recipe.userId]?.username || "Anonymous";

    container.replaceChildren(
      ...(currentUser?.id === recipe.userId
        ? ["By You"]
        : ["By ", createElement("a", { href: `/user/${recipe.username}` }, [recipe.username])])
    );
  });

  return container;
}

// --- Banner ---
export function createRecipeBannerSection(recipe, currentUser) {
  const isCreator = recipe.userId === currentUser;
  return Bannerx({
    isCreator,
    bannerkey: recipe.banner,
    banneraltkey: `Banner for ${recipe.name || "Recipe"}`,
    bannerentitytype: EntityType.RECIPE,
    stateentitykey: "recipe",
    bannerentityid: recipe.recipeid
  });
}

// --- Info Box ---
export function renderInfoBox(recipe) {
  const infoRow = (label, value) =>
    createElement("div", { class: "info-row" }, [
      createElement("strong", { class: "info-label" }, [label + ": "]),
      createElement("span", { class: "info-value" }, [value || "N/A"])
    ]);

  const children = [];

  if (recipe.description) {
children.push(createElement("p", { class: "recipe-description" }, [recipe.description]));
}

  children.push(infoRow("Cook Time", recipe.cookTime));
  if (recipe.cuisine) {
children.push(infoRow("Cuisine", recipe.cuisine));
}
  if (recipe.portionSize) {
children.push(infoRow("Portion Size", recipe.portionSize));
}
  if (recipe.season) {
children.push(infoRow("Season / Occasion", recipe.season));
}
  if (Array.isArray(recipe.dietary) && recipe.dietary.length) {
children.push(infoRow("Dietary", recipe.dietary.join(", ")));
}

  if (recipe.videoUrl) {
    children.push(
      createElement("div", { class: "info-row" }, [
        createElement("span", { class: "info-label" }, ["Video: "]),
        createElement("a", { href: recipe.videoUrl, target: "_blank", class: "info-link" }, ["Watch Tutorial"])
      ])
    );
  }

  if (recipe.notes) {
children.push(infoRow("Notes", recipe.notes));
}

  return createElement("div", { class: "recipe-info-box" }, children);
}

// --- Tags ---
export function renderTags(tags) {
  return createElement("div", { class: "tags-section" }, [
    createElement("h3", {}, ["Tags"]),
    createElement("div", { class: "tags" },
      (tags || []).map(tag => createElement("span", { class: "tag" }, [tag]))
    )
  ]);
}