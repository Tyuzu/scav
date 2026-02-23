import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { apiFetch, bannerFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";
import Galleryx from "../../components/base/Galleryx.js";
import Notify from "../../components/ui/Notify.mjs";
import { ImageGallery } from "../../components/ui/IMageGallery.mjs";

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
   GALLERY VIEW
========================= */

export function showGallery(recipe, isCreator, contentContainer = null) {
  return Galleryx({
    isCreator,
    existingImages: recipe.images || [],
    galleryEntityType: EntityType.RECIPE,
    contentContainer,
    onSubmit: async (formData) => {
      return await bannerFetch(
        `/api/v1/gallery/recipe/${recipe.recipeid}/images`,
        "PUT",
        formData
      );
    },
    onSuccess: () => {
      Notify("Images updated successfully", {
        type: "success",
        duration: 3000,
        dismissible: true
      });

      displayRecipe(contentContainer, true, recipe.recipeid);
    }
  });
}


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
  } catch (err) {
    container.replaceChildren(
      createElement("p", {}, ["Recipe not found or failed to load."])
    );
    return;
  }

  const isFavorite = getFavorites().includes(recipeid);
  const isCreator = currentUser && recipe.userId === currentUser;

  /* =========================
     HEADER
  ========================= */

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

  /* =========================
     BANNER + INFO
  ========================= */

  const bannerEl = createRecipeBannerSection(recipe, currentUser);
  const infoBox = renderInfoBox(recipe);
  const tagsEl = renderTags(recipe.tags);

  /* =========================
     GALLERY
  ========================= */

  const gallerySection = createElement("div", {
    class: "gallery-section"
  });

  const cleanImageNames = (recipe.images || []).filter(Boolean);

  if (cleanImageNames.length) {
    const fullURLs = cleanImageNames.map(name =>
      resolveImagePath(
        EntityType.RECIPE,
        PictureType.PHOTO,
        name
      )
    );

    gallerySection.appendChild(
      ImageGallery(fullURLs)
    );
  }

  if (isCreator) {
    const addImagesBtn = Button("Add Images", "", {
      click: () => {
        const galleryView = showGallery(
          recipe,
          isCreator,
          content
        );

        content.replaceChildren(galleryView);

        const backBtn = Button("← Back to Recipe", "", {
          click: async () => {
            await displayRecipe(
              content,
              isLoggedIn,
              recipeid
            );
          }
        });

        galleryView.prepend(backBtn);
      }
    });

    gallerySection.appendChild(addImagesBtn);
  }

  /* =========================
     INGREDIENTS
  ========================= */

  const ingredientsTitle = createElement("h3", {}, ["Ingredients"]);
  const ingredientsEl = renderIngredients(
    recipe.ingredients,
    isLoggedIn,
    recipe
  );

  /* =========================
     STEPS
  ========================= */

  const stepsTitle = createElement("h3", {}, ["Steps"]);
  const stepsEl = renderSteps(
    recipeid,
    recipe.steps || [],
    recipe
  );

  /* =========================
     ACTIONS
  ========================= */

  const actionsEl = renderActions(
    recipe,
    currentUser,
    content,
    isFavorite,
    recipeid
  );

  /* =========================
     COMMENTS
  ========================= */

  const commentsEl = renderComments(recipe);

  /* =========================
     FINAL ASSEMBLY
  ========================= */

  container.replaceChildren(
    titleEl,
    ...metaInfo,
    authorEl,
    bannerEl,
    infoBox,
    tagsEl,
    ingredientsTitle,
    ingredientsEl,
    gallerySection,
    stepsTitle,
    stepsEl,
    actionsEl,
    commentsEl
  );
}