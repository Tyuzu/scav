import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { apiFetch } from "../../api/api.js";
import { createRecipe } from "./createOrEditRecipe.js";
import { adspace } from "../home/homeHelpers.js";
import { t } from "../../i18n/i18n.js";

export async function displayRecipes(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "recipes-page" });
  const aside = createElement("aside", { class: "recipes-aside" });
  const main = createElement("div", { class: "recipes-main" });

  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(
    createElement("h2", {}, [t("filters", {}, "Filters")]),
    adspace("aside"),
    Button(
      t("createNewRecipe", {}, "Create Recipe"),
      "create-recipe-shortcut",
      { click: () => createRecipe(container) },
      "buttonx secondary"
    )
  );

  // ---------- TITLE ----------
  main.append(
    createElement("h1", {}, [t("recipes", {}, "Recipes")])
  );

  // ---------- ACTIONS ----------
  const actions = createElement("div", { class: "recipe-actions" });

  if (isLoggedIn) {
    actions.append(
      Button(
        t("createNewRecipe", {}, "Create New Recipe"),
        "create-recipe-btn",
        { click: () => createRecipe(container) },
        "buttonx primary"
      )
    );
  }

  main.append(actions, adspace("inbody"));

  // ---------- FETCH DIRECTLY ----------
  let recipes = [];
  try {
    const resp = await apiFetch("/recipes?offset=0&limit=5000");
    recipes = Array.isArray(resp)
      ? resp
      : resp?.recipes || [];
  } catch (err) {
    console.error("Failed to load recipes", err);
  }

  // ---------- LIST ----------
  const list = createElement("div", { class: "recipe-list" });

  if (!recipes.length) {
    list.append(createElement("p", {}, ["No recipes found."]));
    main.append(list);
    return;
  }

  recipes.forEach((recipe, idx) => {
    list.append(createRecipeCard(recipe, isLoggedIn));
    if ((idx + 1) % 6 === 0) {
      list.append(adspace("inlist"));
    }
  });

  main.append(list);
}

// ---------- CARD ----------
function createRecipeCard(recipe, isLoggedIn) {
  const imageUrl = resolveImagePath(
    EntityType.RECIPE,
    PictureType.THUMB,
    recipe.banner
  );

  return createElement("div", { class: "recipe-card" }, [
    Imagex({ src: imageUrl, alt: recipe.title, classes: "thumbnail" }),
    createElement("h3", {}, [recipe.title]),
    createElement("p", {}, [recipe.description]),
    createElement(
      "p",
      {},
      [
        t(
          "prepTime",
          { cookTime: recipe.cookTime || "N/A" },
          `Prep Time: ${recipe.cookTime || "N/A"}`
        )
      ]
    ),
    createElement(
      "div",
      { class: "tags" },
      (recipe.tags || []).map(tag =>
        createElement("span", { class: "tag" }, [tag])
      )
    ),
    Button(
      t("viewRecipe", {}, "View Recipe"),
      `view-${recipe.recipeid}`,
      { click: () => navigate(`/recipe/${recipe.recipeid}`) },
      "buttonx primary"
    )
  ]);
}
