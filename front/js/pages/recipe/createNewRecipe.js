import { createRecipe } from "../../services/recipes/createOrEditRecipe.js";

async function CreateRecipe(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createRecipe(contentContainer, isLoggedIn);
}

export { CreateRecipe };
