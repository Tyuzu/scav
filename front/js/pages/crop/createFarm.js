import { createFarm } from "../../services/crops/createFarm.js";

async function Create(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createFarm(isLoggedIn, contentContainer);
}

export { Create };
