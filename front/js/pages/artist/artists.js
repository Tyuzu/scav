import { displayArtists } from "../../services/artist/artists.js";

async function Artists(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayArtists(contentContainer, isLoggedIn);
}

export { Artists };
