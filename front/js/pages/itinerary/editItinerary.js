import { editItinerary } from "../../services/itinerary/itineraryEdit.js";

async function EditItinerary(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    editItinerary(isLoggedIn, contentContainer);
}

export { EditItinerary };
