import { createPlaceForm } from '../../services/place/createPlaceService.js';

async function CreatePlace(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    const content = document.createElement("div");
    content.classList = "create-section";
    contentContainer.appendChild(content);

    createPlaceForm(isLoggedIn, content)    
}

export { CreatePlace };
