import { renderItineraryForm } from "./createOrEditItinerary";
export function createItinerary(isLoggedIn, container) {
  renderItineraryForm(container, isLoggedIn, "create");
}
