import { displayRecipes } from "../../services/recipes/recipes.js";

async function Recipes(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayRecipes(contentContainer, isLoggedIn);
}

export { Recipes };
