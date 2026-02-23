import { createItinerary } from "../../services/itinerary/itineraryCreate.js";

async function CreateItinerary(isLoggedIn, contentContainer) {
    
    contentContainer.innerHTML = '';
    const content = document.createElement("div");
    content.classList = "create-section";
    contentContainer.appendChild(content);

    createItinerary(isLoggedIn, content) 
}

export { CreateItinerary };
