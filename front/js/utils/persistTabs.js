import { createTabs } from "../components/ui/createTabs";


// export function placeTabs(container, tabs, storageKey = null) {}
export function persistTabs(container, tabs, storageKey = null) {
    try {
        const activeTabId = storageKey ? localStorage.getItem(storageKey) : null;
  
        const tabsElement = createTabs(tabs, storageKey, activeTabId, (newTabId) => {
            if (storageKey) {
                localStorage.setItem(storageKey, newTabId);
            }
        });
  
        container.appendChild(tabsElement);
    } catch (err) {
        console.warn("Tabs component failed to initialize:", err);
    }
  }
  