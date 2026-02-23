import { displayFarms } from "../../services/crops/farm/FarmsHome.js";

async function Farms(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayFarms(contentContainer, isLoggedIn);
}

export { Farms };
