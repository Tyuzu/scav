/**
 * Utility function to create an HTML element with given attributes and optional text.
 * (This function can be shared with subTabs.js if you choose to extract it to a common module.)
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
   * Initializes the main tab container.
   * @param {HTMLElement} content - The container where main tabs are added.
   * @returns {Object} - An object containing:
   *    - mainTabContainer: The overall container.
   *    - mainTabButtons: The container for main tab buttons.
   *    - mainTabContents: The container for main tab sections.
   */
  function initializeMainTabs(content) {
    const mainTabContainer = createElement("div", { class: "main-tab-container" });
    const mainTabButtons = createElement("div", { class: "main-tab-buttons" });
    const mainTabContents = createElement("div", { class: "main-tab-contents" });
  
    mainTabContainer.append(mainTabButtons, mainTabContents);
    content.appendChild(mainTabContainer);
  
    return { mainTabContainer, mainTabButtons, mainTabContents };
  }
  
  /**
   * Activates a main tab given its index.
   * @param {number} index - The index of the main tab to activate.
   * @param {HTMLElement} mainTabButtons - The container for main tab buttons.
   * @param {HTMLElement} mainTabContents - The container for main tab sections.
   */
  function activateMainTab(index, mainTabButtons, mainTabContents) {
    const sections = Array.from(mainTabContents.children);
    const buttons = Array.from(mainTabButtons.children);
  
    sections.forEach((section, i) => {
      section.style.display = i === index ? "block" : "none";
    });
    buttons.forEach((btn, i) => {
      btn.classList.toggle("active", i === index);
    });
  }
  
  export { initializeMainTabs, activateMainTab };
  
