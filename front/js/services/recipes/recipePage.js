import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";

import {
  getFavorites,
  renderAuthor,
  createRecipeBannerSection,
  renderInfoBox,
  renderTags
} from "./recipeRenderers.js";

import {
  renderIngredients,
  renderSteps,
  renderComments,
  renderActions
} from "./recipeSections.js";


/* =========================
   MAIN DISPLAY
========================= */

export async function displayRecipe(content, isLoggedIn, recipeid) {
  content.replaceChildren();

  const container = createElement("div", { class: "recipepage" });
  content.appendChild(container);

  const currentUser = getState("user");

  let recipe;

  try {
    recipe = await apiFetch(`/recipes/recipe/${recipeid}`);
  } catch {
    container.replaceChildren(
      createElement("p", {}, ["Recipe not found or failed to load."])
    );
    return;
  }

  const isFavorite = getFavorites().includes(recipeid);
  // const isCreator = currentUser && recipe.userId === currentUser;

  /* HEADER */
  const titleEl = createElement("h2", {}, [
    recipe.title || "Untitled"
  ]);

  const metaInfo = [];

  if (recipe.version) {
    metaInfo.push(
      createElement("p", { class: "version-info" }, [
        `Version ${recipe.version}`
      ])
    );
  }

  if (recipe.lastUpdated) {
    metaInfo.push(
      createElement("p", { class: "version-info" }, [
        `Last updated: ${new Date(recipe.lastUpdated).toLocaleDateString()}`
      ])
    );
  }

  const authorEl = renderAuthor(recipe, currentUser);

  /* BANNER + INFO */
  const bannerEl = createRecipeBannerSection(recipe, currentUser);
  const infoBox = renderInfoBox(recipe);
  const tagsEl = renderTags(recipe.tags);


  /* INGREDIENTS */
  const ingredientsTitle = createElement("h3", {}, ["Ingredients"]);
  const ingredientsEl = renderIngredients(
    recipe.ingredients,
    isLoggedIn,
    recipe
  );

  /* STEPS */
  const stepsTitle = createElement("h3", {}, ["Steps"]);
  const stepsEl = renderSteps(
    recipeid,
    recipe.steps || [],
    recipe
  );

  /* ACTIONS */
  const actionsEl = renderActions(
    recipe,
    currentUser,
    content,
    isFavorite,
    recipeid
  );

  /* COMMENTS */
  const commentsEl = renderComments(recipe);

  /* FINAL ASSEMBLY */
  container.replaceChildren(
    titleEl,
    ...metaInfo,
    authorEl,
    bannerEl,
    infoBox,
    tagsEl,
    ingredientsTitle,
    ingredientsEl,
    stepsTitle,
    stepsEl,
    actionsEl,
    commentsEl
  );
}