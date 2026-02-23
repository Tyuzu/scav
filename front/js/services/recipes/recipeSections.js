import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { addToCart } from "../cart/addToCart.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { createCommentsSection } from "../comments/comments.js";
import { editRecipe } from "./createOrEditRecipe.js";
import { makeInlineEditable, getStepKey } from "./recipeRenderers.js";

/* =========================
   INGREDIENTS
========================= */

export function renderIngredients(ingredients, isLoggedIn, recipe) {
  const ingList = createElement("ul", { class: "ingredients-list" });

  if (!Array.isArray(ingredients) || !ingredients.length) {
    return createElement("ul", { class: "ingredients-list" }, [
      createElement("li", {}, ["No ingredients available."])
    ]);
  }

  function makeAddBtn(item, qty, unit) {
    const btn = Button("Add to Cart", "", {}, "small-button");
    btn.addEventListener("click", () =>
      addToCart({
        itemId: item.itemId,
        quantity: qty || 1,
        isLoggedIn
      })
    );
    return btn;
  }

  ingredients.forEach((ing, idx) => {
    const li = createElement("li", {});
    const textContainer = createElement("span", {}, [
      `${ing.quantity || ""} ${ing.unit || ""} ${ing.name || ""}`
    ]);

    li.appendChild(textContainer);

    if (!ing.itemId)
      li.appendChild(createElement("span", { class: "warning" }, ["Unavailable in store"]));

    if (isLoggedIn && ing.itemId)
      li.appendChild(makeAddBtn(ing, ing.quantity, ing.unit));

    // Author controls
    if (getState("user")?.id === recipe.userId) {
      const editBtn = Button("Edit", "", {}, "tiny-button");
      const delBtn = Button("Delete", "", {}, "tiny-button");

      editBtn.addEventListener("click", () => {
        makeInlineEditable(textContainer, ing.name, newVal => {
          ing.name = newVal;
          textContainer.replaceChildren(
            `${ing.quantity || ""} ${ing.unit || ""} ${newVal}`
          );
        });
      });

      delBtn.addEventListener("click", () => {
        if (confirm("Delete this ingredient?")) {
          li.remove();
          ingredients.splice(idx, 1);
        }
      });

      li.append(editBtn, delBtn);
    }

    ingList.appendChild(li);
  });

  return ingList;
}

/* =========================
   STEPS
========================= */

export function renderSteps(recipeid, steps, recipe) {
  const completedSteps = new Set(
    JSON.parse(localStorage.getItem(getStepKey(recipeid)) || "[]")
  );

  const progressFill = createElement("div", { class: "progress-fill" });
  const progressText = createElement("span", { class: "progress-text" });

  function updateProgress() {
    const pct = steps.length
      ? Math.round((completedSteps.size / steps.length) * 100)
      : 0;
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `${pct}% done`;
  }

  updateProgress();

  const stepsOl = createElement("ol", {});

  steps.forEach((s, idx) => {
    const text = typeof s === "object" ? s.text : s;
    const li = createElement("li", {});
    const checkbox = createElement("input", { type: "checkbox" });

    checkbox.checked = completedSteps.has(idx);

    checkbox.addEventListener("change", e => {
      e.target.checked
        ? completedSteps.add(idx)
        : completedSteps.delete(idx);

      localStorage.setItem(
        getStepKey(recipeid),
        JSON.stringify([...completedSteps])
      );

      updateProgress();
    });

    const textContainer = createElement("span", {}, [text]);
    li.append(checkbox, textContainer);

    // Author controls
    if (getState("user")?.id === recipe.userId) {
      const editBtn = Button("Edit", "", {}, "tiny-button");
      const delBtn = Button("Delete", "", {}, "tiny-button");

      editBtn.addEventListener("click", () => {
        makeInlineEditable(textContainer, text, newVal => {
          steps[idx] = { ...s, text: newVal };
          textContainer.replaceChildren(newVal);
        });
      });

      delBtn.addEventListener("click", () => {
        if (confirm("Delete this step?")) {
          li.remove();
          steps.splice(idx, 1);
          updateProgress();
        }
      });

      li.append(editBtn, delBtn);
    }

    stepsOl.appendChild(li);
  });

  const progressBar = createElement("div", { class: "progress-bar" }, [
    progressFill,
    progressText
  ]);

  return createElement("div", { class: "steps-section" }, [
    progressBar,
    stepsOl
  ]);
}

/* =========================
   COMMENTS
========================= */

export function renderComments(recipe) {
  const wrapper = createElement("div", { class: "recipe-comments" });

  const toggle = createElement(
    "button",
    { class: "toggle-comments btn btn-link" },
    ["💬 Show Comments"]
  );

  let commentsEl = null;
  let visible = false;
  let loaded = false;

  toggle.addEventListener("click", async () => {
    if (!loaded) {
      try {
        commentsEl = await createCommentsSection(
          "recipe",           // MUST match backend entitytype
          recipe.recipeid,    // entityid
          getState("user")
        );

        wrapper.appendChild(commentsEl);
        loaded = true;
      } catch (err) {
        console.error(err);
        Notify("Failed to load comments.", {
          type: "error",
          duration: 3000,
          dismissible: true
        });
        return;
      }
    }

    commentsEl.style.display = visible ? "none" : "";
    toggle.textContent = visible
      ? "💬 Show Comments"
      : "💬 Hide Comments";

    visible = !visible;
  });

  wrapper.append(
    createElement("h4", {}, ["Comments"]),
    toggle
  );

  return wrapper;
}

/* =========================
   ACTIONS
========================= */

export function renderActions(
  recipe,
  currentUser,
  contentContainer,
  isFavorite,
  recipeid
) {
  const favBtn = Button(
    isFavorite ? "Unsave" : "Save Recipe",
    "",
    {},
    "buttonx secondary"
  );

  favBtn.addEventListener("click", () => {
    isFavorite = !isFavorite;
    localStorage.setItem(
      "favoriteRecipes",
      JSON.stringify(
        isFavorite
          ? [...new Set([...(JSON.parse(localStorage.getItem("favoriteRecipes") || "[]")), recipeid])]
          : JSON.parse(localStorage.getItem("favoriteRecipes") || "[]").filter(id => id !== recipeid)
      )
    );
    favBtn.textContent = isFavorite ? "Unsave" : "Save Recipe";
  });

  const shareBtn = Button("Copy Link", "", {}, "buttonx secondary");
  shareBtn.addEventListener("click", () =>
    navigator.clipboard.writeText(window.location.href)
  );

  const printBtn = Button("Print", "", {}, "buttonx secondary");
  printBtn.addEventListener("click", () => window.print());

  const actions = [favBtn, shareBtn, printBtn];

  if (currentUser === recipe.userId) {
    const editBtn = Button("Edit", "", {}, "buttonx secondary");
    editBtn.addEventListener("click", () =>
      editRecipe(contentContainer, recipe)
    );
    actions.push(editBtn);
  }

  const backBtn = Button("Back", "", {}, "buttonx primary");
  backBtn.addEventListener("click", () => history.back());

  actions.push(backBtn);

  return createElement("div", { class: "recipe-actions" }, actions);
}