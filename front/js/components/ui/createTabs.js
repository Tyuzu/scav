import "../../../css/ui/createTabs.css";
import { createDivButton, createContainer } from "../eventHelper.js";
import { createElement } from "../../components/createElement.js";
import { getRouteState, setRouteState } from "../../state/state.js";
import { makeDraggableScroll } from "../dragnav.js";

/**
 * @param {Array<{id: string, title: string, render: Function}>} tabs 
 * @param {string|null} routeKey - used to track active tab state via route-based memory
 * @param {string|null} initialTabId - optionally specify initial tab
 * @param {Function|null} onTabChange - optional callback: (tabId) => void
 */
export function createTabs(tabs, routeKey = null, initialTabId = null, onTabChange = null) {
  const tabContainer = createContainer(["tabs-container"]);
  const tabButtons = createContainer(["tab-buttons"]);
  const tabContents = createContainer(["tab-contents"]);

  const tabContentMap = new Map(); // id → content container
  const buttonMap = new Map();     // id → button element

  // --- Create buttons and content containers ---
  tabs.forEach(({ id, title }, index) => {
    const contentContainer = createElement("article", {
      id,
      class: ["tab-content"]
    });

    const tabButton = createDivButton({
      text: title,
      classes: ["tab-button"],
      attributes: { "data-id": id }, // ✅ added so outside code can always read
      events: {
        click: () => activateTab(id)
      }
    });

    tabButtons.appendChild(tabButton);
    tabContents.appendChild(contentContainer);

    tabContentMap.set(id, contentContainer);
    buttonMap.set(id, tabButton);
  });

  makeDraggableScroll(tabButtons);
  tabContainer.appendChild(tabButtons);
  tabContainer.appendChild(tabContents);

  // --- Activate a tab by ID ---
  function activateTab(tabId) {
    tabs.forEach(({ id, render }) => {
      const btn = buttonMap.get(id);
      const content = tabContentMap.get(id);
      const isActive = id === tabId;

      btn.classList.toggle("active", isActive);
      content.classList.toggle("active", isActive);

      if (isActive && !content.dataset.rendered) {
        render(content);
        content.dataset.rendered = "true";
      }
    });

    if (routeKey) {
      const tabState = getRouteState(routeKey) || {};
      tabState.activeTab = tabId;
      setRouteState(routeKey, tabState);
    }

    if (onTabChange) onTabChange(tabId); // ✅ ensures search form updates `currentTab`
  }

  // --- Determine and activate initial tab ---
  let initial = initialTabId || tabs[0]?.id;

  if (routeKey) {
    const saved = getRouteState(routeKey);
    if (saved?.activeTab && tabContentMap.has(saved.activeTab)) {
      initial = saved.activeTab;
    }
  }

  // Defer initial render until DOM is fully ready
  if (initial) {
    queueMicrotask(() => activateTab(initial));
  }

  return tabContainer;
}
