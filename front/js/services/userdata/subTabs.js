import { renderTabContent } from "./tabRenderer.js";

/**
 * Creates a tab structure for a given section.
 * @param {string} title - The title of the section.
 * @param {string[]} tabs - List of tab names.
 * @param {string} username - The username for fetching data.
 * @returns {Object} - An object containing:
 *    - mainTabButton: The button to activate the whole section.
 *    - tabSection: The container holding child tabs.
 *    - childTabs: An array of child tab buttons.
 *    - tabContentContainers: An array of corresponding content containers.
 */
function createTabStructure(title, tabs, username) {
  const sectionId = `${title.toLowerCase()}-section`;
  const tabSection = createElement("div", { id: sectionId, style: "display: none;" });
  const tabContainer = createElement("div", { class: `${title.toLowerCase()}-tab-container` });
  const tabButtons = createElement("div", { class: `${title.toLowerCase()}-tab-buttons` });
  const tabContents = createElement("div", { class: `${title.toLowerCase()}-tab-contents` });

  tabContainer.append(tabButtons, tabContents);
  tabSection.appendChild(tabContainer);

  const childTabs = [];
  const tabContentContainers = [];

  tabs.forEach((entityType) => {
    const tabContent = createElement("div", {
      id: `${entityType}-container`,
      class: "tabs-content",
      style: "display: none;"
    });
    tabContents.appendChild(tabContent);
    tabContentContainers.push(tabContent);

    const tabButton = createTabButton(entityType, tabContent, username);
    tabButtons.appendChild(tabButton);
    childTabs.push(tabButton);
  });

  const mainTabButton = createElement("div", { class: "main-tab-button" }, title);
  // Do not attach a click listener here so the caller can handle main tab activation.
  return { mainTabButton, tabSection, childTabs, tabContentContainers };
}

/**
 * Creates a child tab button and attaches its event listener.
 * @param {string} entityType - The tab’s entity type.
 * @param {HTMLElement} contentContainer - The content container for this tab.
 * @param {string} username - The username for fetching data.
 * @returns {HTMLButtonElement} - The created tab button.
 */
function createTabButton(entityType, contentContainer, username) {
  const tabButton = createElement("div", { class: "tab-button" }, capitalize(entityType));
  tabButton.addEventListener("click", () => {
    activateChildTab(tabButton, contentContainer, username, entityType);
  });
  return tabButton;
}

/**
 * Activates a child tab and loads its content if not already loaded.
 * @param {HTMLElement} tabButton - The tab button to activate.
 * @param {HTMLElement} contentContainer - The associated content container.
 * @param {string} username - The username for fetching data.
 * @param {string} entityType - The entity type.
 */
function activateChildTab(tabButton, contentContainer, username, entityType) {
  if (!entityType) {
    console.error("❌ ERROR: entityType is undefined. Cannot activate tab.");
    return;
  }

  // Deactivate sibling tabs and hide their content.
  const allTabContainers = Array.from(contentContainer.parentElement.children);
  const allTabButtons = Array.from(tabButton.parentElement.children);
  allTabContainers.forEach(tab => (tab.style.display = "none"));
  allTabButtons.forEach(btn => btn.classList.remove("active"));

  // Activate the selected tab.
  contentContainer.style.display = "block";
  tabButton.classList.add("active");

  // Load content if not already loaded.
  if (!contentContainer.dataset.loaded) {
    console.log(`🔍 Fetching data for: ${username} | Entity: ${entityType}`);
    renderTabContent(contentContainer, username, entityType);
    contentContainer.dataset.loaded = "true";
  }
}

/**
 * Utility function to create an HTML element with given attributes and optional text.
 * @param {string} tag - HTML tag name.
 * @param {Object} attributes - Attributes to set on the element.
 * @param {string} [textContent] - Optional text content.
 * @returns {HTMLElement} - The created element.
 */
function createElement(tag, attributes = {}, textContent = "") {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (textContent) element.textContent = textContent;
  return element;
}

/**
 * Capitalizes the first letter of the given string.
 * @param {string} str - The input string.
 * @returns {string} - The capitalized string.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export { createTabStructure, activateChildTab };
