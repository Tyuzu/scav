import { displayAboutCrop } from "../../services/crops/crop/cropAboutPage.js";

async function AboutCrop(isLoggedIn, cropID, contentContainer) {
    contentContainer.innerHTML = '';
    displayAboutCrop(contentContainer, cropID, isLoggedIn);
}

export { AboutCrop };
