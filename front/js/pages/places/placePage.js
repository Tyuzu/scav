import { displayPlace } from '../../services/place/placeService.js';

async function Place(isLoggedIn, placeid, contentContainer) {
    const content = document.createElement("div");
    content.classList = "placepage";
    contentContainer.appendChild(content);
    displayPlace(isLoggedIn, placeid, content)
}

export { Place };
