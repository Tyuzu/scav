import { apiFetch } from "../../api/api";
import { renderItineraryForm } from "./createOrEditItinerary";

export async function editItinerary(container, isLoggedIn, id) {
  const itinerary = await apiFetch(`/itineraries/all/${id}`);
  renderItineraryForm(container, isLoggedIn, "edit", itinerary);
}
