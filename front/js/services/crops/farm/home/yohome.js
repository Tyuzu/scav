// YoHome.js
import { createElement } from "../../components/createElement.js";

import { clearElement, createListingTabs } from "./listingcon.js";
import {
  createWeatherInfoWidget,
  createSearchBar,
  createNavWrapper,
  createAuthForms,
  adspace
} from "./homeHelpers.js";

// --- MAIN HOME ---
export function YoHome(isLoggedIn, container) {
  clearElement(container);

  const aside = createElement("aside", { class: "homesidebar" }, [
    createWeatherInfoWidget(),
    createSearchBar(),
  ]);

  const mainContent = createElement("div", { class: "main-content" }, [
    adspace("top"),
    createNavWrapper(),
    adspace("bottom"),
  ]);

  if (isLoggedIn) {
    // defer heavy DOM work
    requestIdleCallback(() => {
      mainContent.appendChild(createListingTabs());
    });
  } else {
    mainContent.appendChild(createAuthForms());
  }

  const homepageContent = createElement("div", { class: "hyperlocal-home two-column" }, [
    mainContent,
    aside,
  ]);

  const fragment = document.createDocumentFragment();
  fragment.appendChild(homepageContent);
  // fragment.appendChild(
  //   createElement("div", {}, [
  //     createElement("button", { id: "install-pwa", style: "display:none;" }, ["Install App"]),
  //   ])
  // );

  container.appendChild(fragment);
}
