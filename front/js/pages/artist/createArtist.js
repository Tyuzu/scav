import { createArtist } from "../../services/artist/createOrEditArtist.js";

async function CreateArtist(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    createArtist(isLoggedIn, contentContainer);
}

export { CreateArtist };
