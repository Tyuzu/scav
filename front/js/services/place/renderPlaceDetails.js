import { createElement } from "../../components/createElement.js";
import { editPlaceForm, deletePlace } from "./placeService.js";
import { analyticsPlace } from "./placeAnanlytics.js";
import Button from "../../components/base/Button.js";
import { reportPost } from "../reporting/reporting.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Datex from "../../components/base/Datex.js";
import Bannerx from "../../components/base/Bannerx.js";

/** Banner section */
function createEventBannerSection(place, isCreator) {
  return Bannerx({
    isCreator : isCreator,
    bannerkey : place.banner,
    banneraltkey : `Banner for ${place.name || "Place"}`,
    bannerentitytype : EntityType.PLACE,
    stateentitykey : "place",
    bannerentityid : place.placeid
  });
}

function renderPlaceDetails(isLoggedIn, content, place, isCreator) {
  content.replaceChildren();
console.log(place);
  // const createdDate = new Date(place.created_at).toLocaleString();
  const createdDate = Datex(place.created_at);
  // const updatedDate = new Date(place.updated_at).toLocaleString();
  const updatedDate = Datex(place.updated_at);
  const latitude = place.coordinates?.lat || "N/A";
  const longitude = place.coordinates?.lng || "N/A";

  
  // Core details section
  const detailsSection = createElement("section", { id: "placedetails", class: "placedetails" }, [
    createElement("h1", {}, [place.name]),
    createElement("p", {}, [createElement("strong", {}, ["Description: "]), place.description || "N/A"]),
    createElement("p", {}, [createElement("strong", {}, ["Address: "]), place.address || "N/A"]),
    createElement("p", {}, [createElement("strong", {}, ["Coordinates: "]), `Lat: ${latitude}, Lng: ${longitude}`]),
    createElement("p", {}, [createElement("strong", {}, ["Category: "]), place.category || "N/A"]),
    createElement("p", {}, [createElement("strong", {}, ["Created: "]), createdDate]),
    createElement("p", {}, [createElement("strong", {}, ["Last Updated: "]), updatedDate]),
  ]);

  if (isCreator) {
    const actionsWrapper = createElement("div", { class: "hvflex" }, []);
    const editContainer = createElement("div", { id: "editplace" }, []);

    let placeanacon = createElement("div",{},[]);
    
    actionsWrapper.appendChild(
      Button("Edit Place", "edit-place-btn", {
        click: () => editPlaceForm(isLoggedIn, place.placeid, editContainer),
      }, "buttonx secondary")
    );

    actionsWrapper.appendChild(
      Button("Delete Place", "delete-place-btn", {
        click: () => deletePlace(isLoggedIn, place.placeid),
      }, "delete-btn buttonx")
    );

    actionsWrapper.appendChild(
      Button("View Analytics", "analytics-place-btn", {
        click: () => analyticsPlace(placeanacon, isLoggedIn, place.placeid),
      }, "buttonx secondary")
    );

    // actionsWrapper.appendChild(
    //   Button("Hire", "hire-place-btn", {
    //     click: () => jobsHire(placeanacon, "place", place.placeid),
    //   }, "buttonx secondary")
    // );

    detailsSection.appendChild(actionsWrapper);
    detailsSection.appendChild(editContainer);
    detailsSection.appendChild(placeanacon);
  } else {
    // const reportBtn = createElement("button", { class: "report-comment", type: "button" }, ["Report"]);
    // reportBtn.addEventListener("click", () => reportPost(place.placeid, "place", "", ""));
    const reportBtn = Button("Report", "button-dfsh4", { 
      click: () => reportPost(place.placeid, "place", "", "")
     }, "report-comment buttonx");
    detailsSection.appendChild(reportBtn);
  }

  // content.appendChild(bannerSection);
  content.appendChild(createEventBannerSection(place, isCreator));
  content.appendChild(detailsSection);
}

export { renderPlaceDetails };
