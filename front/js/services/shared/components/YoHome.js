/**
 * Consolidated YoHome Component
 * Previously duplicated in: home/, home_farm/, crops/farm/home/
 */

import { createElement } from "../../../components/createElement.js";
import { clearElement, createListingTabs } from "./ListingTabs.js";
import {
  createSearchBar,
  createNavWrapper,
  createAuthForms,
  adspace
} from "../helpers/homeHelpers.js";

/**
 * Main home page component
 * @param {boolean} isLoggedIn - User authentication status
 * @param {HTMLElement} container - Container to render into
 */
export function YoHome(isLoggedIn, container) {
  clearElement(container);

  const aside = createElement("aside", { class: "homesidebar" }, [
    createSearchBar(),
    adspace("aside")
  ]);

  const mainContent = createElement("div", { class: "main-content" }, [
    adspace("top"),
    createNavWrapper(),
    adspace("bottom")
  ]);

  if (isLoggedIn) {
    // defer heavy DOM work
    requestIdleCallback(() => {
      mainContent.appendChild(createListingTabs());
    });
  } else {
    mainContent.appendChild(createAuthForms());
  }

  const homepageContent = createElement(
    "div",
    { class: "hyperlocal-home two-column" },
    [mainContent, aside]
  );

  const fragment = document.createDocumentFragment();
  fragment.appendChild(homepageContent);
  fragment.appendChild(
    createElement("div", {}, [
      createElement("button", {
        id: "install-pwa",
        style: "display:none;"
      }, ["Install App"])
    ])
  );

  container.appendChild(fragment);
}
