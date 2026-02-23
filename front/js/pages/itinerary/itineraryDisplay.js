import { displayItinerary } from "../../services/itinerary/itineraryDisplay.js";

async function Itinerary(isLoggedIn, contentContainer) {
    displayItinerary(isLoggedIn, contentContainer);
}

export { Itinerary };
