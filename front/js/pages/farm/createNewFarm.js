import { createFarm } from "../../services/crops/farm/createFarm.js";

async function CreateFarm(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createFarm(isLoggedIn, contentContainer);
}

export { CreateFarm };
