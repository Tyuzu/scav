import { displayPlaces } from '../../services/place/displayPlaces.js';

async function Places(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';

    displayPlaces(isLoggedIn, contentContainer)
}

export { Places };
