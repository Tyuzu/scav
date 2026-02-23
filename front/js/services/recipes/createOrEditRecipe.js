// js/services/recipes/createOrEditRecipe.js
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import { apiFetch } from "../../api/api.js";
import { displayRecipe } from "./recipePage.js";
import { navigate } from "../../routes/index.js";

export function createRecipe(container) {
  renderRecipeForm(container, "create", null);
}

export function editRecipe(container, recipe) {
  renderRecipeForm(container, "edit", recipe);
}

function renderRecipeForm(container, mode = "create", recipe = null) {
  container.replaceChildren();

  const form = createElement("form", {
    class: "create-section",
    enctype: "multipart/form-data",
  });

  const titleGroup = createFormGroup({
    label: "Recipe Title",
    type: "text",
    id: "title",
    value: recipe?.title || "",
    placeholder: "Enter recipe title",
    required: true,
  });

  const descriptionGroup = createFormGroup({
    label: "Description",
    type: "textarea",
    id: "description",
    value: recipe?.description || "",
    placeholder: "Short summary of the dish",
    required: true,
    additionalProps: { rows: 3 },
  });

  const cuisineGroup = createFormGroup({
    label: "Cuisine",
    type: "text",
    id: "cuisine",
    value: recipe?.cuisine || "",
    placeholder: "e.g. Italian, Indian, Mexican",
  });

  const dietaryGroup = createFormGroup({
    label: "Dietary / Allergen Info (comma-separated)",
    type: "text",
    id: "dietary",
    value: (recipe?.dietary || []).join(", "),
    placeholder: "e.g. Vegan, Gluten-Free, Nut-Free",
  });

  const cookTimeGroup = createFormGroup({
    label: "Cook Time",
    type: "text",
    id: "cookTime",
    value: recipe?.cookTime || "",
    placeholder: "e.g. 30 mins",
  });

  const servingsGroup = createFormGroup({
    label: "Servings",
    type: "number",
    id: "servings",
    value: recipe?.servings || "",
    placeholder: "e.g. 4",
    additionalProps: { min: 1 },
  });

  const portionGroup = createFormGroup({
    label: "Portion Size / Servings Scaling",
    type: "text",
    id: "portionSize",
    value: recipe?.portionSize || "",
    placeholder: "e.g. 1 cup per person",
  });

  const seasonGroup = createFormGroup({
    label: "Season / Occasion",
    type: "text",
    id: "season",
    value: recipe?.season || "",
    placeholder: "e.g. Winter, Christmas",
  });

  const tagsGroup = createFormGroup({
    label: "Tags (comma-separated)",
    type: "text",
    id: "tags",
    value: (recipe?.tags || []).join(", "),
    placeholder: "e.g. spicy, vegan, south indian",
  });

  const difficultyGroup = createFormGroup({
    label: "Difficulty",
    type: "select",
    id: "difficulty",
    value: recipe?.difficulty || "",
    options: [
      { value: "", label: "Select difficulty" },
      { value: "Easy", label: "Easy" },
      { value: "Medium", label: "Medium" },
      { value: "Hard", label: "Hard" },
    ],
  });

  // --- Ingredients ---
const ingredientsGroup = createElement("div", { class: "form-group" });
ingredientsGroup.appendChild(createElement("label", {}, ["Ingredients"]));
const ingredientsList = createElement("div", { id: "ingredients-list" });
ingredientsGroup.appendChild(ingredientsList);

function addIngredientRow(name = "", quantity = "", unit = "", alternatives = []) {
  const altStr = alternatives
    .map(a => [a.name, a.itemId, a.type].join("|"))
    .join(",");

  const row = createElement("div", { class: "ingredient-row hvflex" }, [
    createElement("input", {
      type: "text",
      name: "ingredientName[]",
      placeholder: "Name",
      value: name,
      required: true,
    }),
    createElement("input", {
      type: "number",
      name: "ingredientQuantity[]",
      placeholder: "Qty",
      step: "any",
      value: quantity !== "" ? String(quantity) : "",
      required: true,
    }),
    createElement("input", {
      type: "text",
      name: "ingredientUnit[]",
      placeholder: "Unit",
      value: unit,
      required: true,
    }),
    createElement("input", {
      type: "text",
      name: "ingredientAlternatives[]",
      placeholder: "Alternatives (name|itemId|type, ...)",
      value: altStr,
    }),
    Button("−", "", { click: () => row.remove() }, "remove-btn"),
  ]);

  ingredientsList.appendChild(row);
}

if (recipe?.ingredients?.length) {
  recipe.ingredients.forEach(ing =>
    addIngredientRow(
      ing.name,
      ing.quantity,
      ing.unit,
      ing.alternatives || []
    )
  );
} else {
  addIngredientRow();
}

const addIngredientBtn = Button(
  "Add Ingredient",
  "",
  { click: () => addIngredientRow() }
);

ingredientsGroup.appendChild(addIngredientBtn);


  // --- Steps ---
  const stepsGroup = createFormGroup({
    label: "Steps",
    type: "textarea",
    id: "steps",
    value: (recipe?.steps || []).join("\n"),
    placeholder: "Each step on a new line",
    required: true,
    additionalProps: { rows: 6 },
  });

  // --- Video URL ---
  const videoGroup = createFormGroup({
    label: "Video URL / Cooking Tutorial",
    type: "url",
    id: "videoUrl",
    value: recipe?.videoUrl || "",
    placeholder: "e.g. https://www.youtube.com/...",
  });

  // --- Notes ---
  const notesGroup = createFormGroup({
    label: "Recipe Notes / Tips",
    type: "textarea",
    id: "notes",
    value: recipe?.notes || "",
    placeholder: "Extra tips, variations, or notes",
    additionalProps: { rows: 3 },
  });

  // --- Submit Button ---
  const submitBtn = Button(mode === "edit" ? "Update Recipe" : "Create Recipe", "", { type: "submit" });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const endpoint = mode === "edit"
      ? `/recipes/recipe/${recipe?.recipeid}`
      : "/recipes";
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const result = await apiFetch(endpoint, method, formData);
      if (mode === "create") {
        form.reset();
      }
      alert("Recipe saved successfully!");
      displayRecipe(container, true, result?.recipeid);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to save recipe.");
    }
  });

  form.append(
    titleGroup,
    descriptionGroup,
    cuisineGroup,
    dietaryGroup,
    cookTimeGroup,
    servingsGroup,
    portionGroup,
    seasonGroup,
    tagsGroup,
    difficultyGroup,
    ingredientsGroup,
    stepsGroup,
    videoGroup,
    notesGroup,
    // imageGroup,
    submitBtn
  );

  container.appendChild(form);
}
