/**
 * Consolidated DisplayPattern Template
 * Provides reusable template for async display/render functionality
 * Duplicated across 68+ files with display function patterns
 */

import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";

/**
 * Creates a standard display function following the common pattern:
 * fetch → render → attach listeners → error handling
 *
 * @param {Object} config - Configuration object
 * @param {string} config.endpoint - API endpoint to fetch from
 * @param {Function} config.renderFn - Render function that returns HTML element(s)
 *                                     Receives: (data, container, isLoggedIn)
 * @param {Function} config.onError - Optional error handler function
 * @param {string} config.loadingMessage - Message to show while loading
 * @param {string} config.emptyMessage - Message to show if no data
 * @param {Boolean} config.clearContainer - Whether to clear container before rendering
 * @returns {Function} async display(container, isLoggedIn) function
 */
export function createDisplayPattern({
  endpoint,
  renderFn,
  onError = null,
  loadingMessage = "Loading...",
  emptyMessage = "No data available",
  clearContainer = true
} = {}) {
  /**
   * Display function to be called when rendering the component
   * @param {HTMLElement} container - Container to render into
   * @param {Boolean} isLoggedIn - User authentication status
   */
  return async function display(container, isLoggedIn) {
    if (clearContainer) {
      container.replaceChildren();
    }

    // Show loading state
    const loadingEl = createElement("div", { class: "display-loading" }, [loadingMessage]);
    container.appendChild(loadingEl);

    try {
      // Fetch data from API
      const data = await apiFetch(endpoint);

      // Clear loading indicator
      container.replaceChildren();

      // Check for empty data
      if (!data || (Array.isArray(data) && data.length === 0)) {
        container.appendChild(
          createElement("div", { class: "display-empty" }, [emptyMessage])
        );
        return;
      }

      // Call render function with data
      const rendered = renderFn(data, container, isLoggedIn);

      // Handle single element or array of elements
      if (Array.isArray(rendered)) {
        rendered.forEach((el) => container.appendChild(el));
      } else if (rendered) {
        container.appendChild(rendered);
      }
    } catch (err) {
      console.error(`Failed to display from ${endpoint}:`, err);

      container.replaceChildren();

      // Show error message
      const errorEl = createElement("div", { class: "display-error" }, [
        `Failed to load. Please try again later.`
      ]);
      container.appendChild(errorEl);

      // Call optional error handler
      if (onError) {
        onError(err);
      }
    }
  };
}

/**
 * Helper to create a paginated display function
 * @param {Object} config - Configuration with endpoint, renderFn, pagination settings
 * @param {string} config.endpoint - Base API endpoint
 * @param {Function} config.renderFn - Render function
 * @param {number} config.pageSize - Items per page (default: 20)
 * @param {Function} config.onPageChange - Optional callback when page changes
 * @returns {Object} {display, goToPage, nextPage, prevPage, currentPage}
 */
export function createPaginatedDisplay({
  endpoint,
  renderFn,
  pageSize = 20,
  onPageChange = null,
  loadingMessage = "Loading...",
  emptyMessage = "No data available"
} = {}) {
  let currentPage = 0;
  let totalPages = 1;

  const paginatingDisplay = async (container, isLoggedIn) => {
    if (container.replaceChildren) {
      container.replaceChildren();
    }

    // Show loading
    const loadingEl = createElement("div", { class: "display-loading" }, [loadingMessage]);
    container.appendChild(loadingEl);

    try {
      // Fetch paginated data
      const url = `${endpoint}?page=${currentPage}&limit=${pageSize}`;
      const response = await apiFetch(url);

      container.replaceChildren();

      // Check for paginated response structure
      const data = response.items || response.data || response;
      const total = response.total || 0;

      if (!data || (Array.isArray(data) && data.length === 0)) {
        container.appendChild(
          createElement("div", { class: "display-empty" }, [emptyMessage])
        );
        return;
      }

      // Calculate total pages
      totalPages = Math.ceil(total / pageSize);

      // Render content
      const rendered = renderFn(data, container, isLoggedIn);
      if (Array.isArray(rendered)) {
        rendered.forEach((el) => container.appendChild(el));
      } else if (rendered) {
        container.appendChild(rendered);
      }

      // Render pagination controls
      const paginationEl = createPaginationControls(currentPage, totalPages, {
        onNext: () => nextPage(container, isLoggedIn),
        onPrev: () => prevPage(container, isLoggedIn)
      });

      if (paginationEl) {
        container.appendChild(paginationEl);
      }

      if (onPageChange) {
        onPageChange(currentPage, totalPages);
      }
    } catch (err) {
      console.error(`Failed to display paginated data from ${endpoint}:`, err);
      container.replaceChildren();

      const errorEl = createElement("div", { class: "display-error" }, [
        "Failed to load. Please try again later."
      ]);
      container.appendChild(errorEl);
    }
  };

  const goToPage = async (page, container, isLoggedIn) => {
    if (page >= 0 && page < totalPages) {
      currentPage = page;
      await paginatingDisplay(container, isLoggedIn);
    }
  };

  const nextPage = async (container, isLoggedIn) => {
    if (currentPage < totalPages - 1) {
      await goToPage(currentPage + 1, container, isLoggedIn);
    }
  };

  const prevPage = async (container, isLoggedIn) => {
    if (currentPage > 0) {
      await goToPage(currentPage - 1, container, isLoggedIn);
    }
  };

  return {
    display: paginatingDisplay,
    goToPage,
    nextPage,
    prevPage,
    get currentPage() {
      return currentPage;
    },
    get totalPages() {
      return totalPages;
    }
  };
}

/**
 * Helper to create pagination control UI
 * @private
 */
function createPaginationControls(currentPage, totalPages, handlers = {}) {
  if (totalPages <= 1) {
    return null;
  }

  const wrapper = createElement("div", { class: "pagination-controls" });

  const prevBtn = createElement("button", { class: "pagination-prev" }, ["← Previous"]);
  const nextBtn = createElement("button", { class: "pagination-next" }, ["Next →"]);
  const pageInfo = createElement("span", { class: "pagination-info" }, [
    `Page ${currentPage + 1} of ${totalPages}`
  ]);

  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage >= totalPages - 1;

  prevBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (handlers.onPrev) handlers.onPrev();
  });

  nextBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (handlers.onNext) handlers.onNext();
  });

  wrapper.append(prevBtn, pageInfo, nextBtn);
  return wrapper;
}
