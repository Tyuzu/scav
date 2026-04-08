/**
 * Consolidated Services Index
 * Central reference for all shared/consolidated modules
 * 
 * This file provides a quick reference for accessing consolidated components,
 * patterns, and utilities that were previously duplicated across the codebase.
 */

// ==========================================
// CONSOLIDATED COMPONENTS
// ==========================================

/**
 * YoHome Component - Main home page layout
 * Previously duplicated in: home/, home_farm/, crops/farm/home/
 * 
 * Usage:
 * import { YoHome } from "../shared/components/YoHome.js";
 * YoHome(isLoggedIn, container);
 */
export { YoHome } from "./components/YoHome.js";

/**
 * ListingTabs Component - Tabbed listing interface
 * Previously duplicated in: home/, home_farm/, crops/farm/home/
 * Exports: createListingTabs, clearElement
 * 
 * Usage:
 * import { createListingTabs, clearElement } from "../shared/components/ListingTabs.js";
 * const tabs = createListingTabs();
 */
export {
  createListingTabs,
  clearElement
} from "./components/ListingTabs.js";

/**
 * MediaRenders - Unified media rendering
 * Previously duplicated in: feed/, newchat/, merechats/ (9 files)
 * Exports: RenderVideoPost, RenderImagePost, RenderAudioPost
 * 
 * Usage:
 * import { RenderImagePost } from "../shared/components/MediaRenders.js";
 * await RenderImagePost(container, images, EntityType.FEED);
 */
export {
  RenderVideoPost,
  RenderImagePost,
  RenderAudioPost
} from "./components/MediaRenders.js";

// ==========================================
// CONSOLIDATED PATTERNS (TEMPLATES)
// ==========================================

/**
 * FormBuilder Pattern - Reusable form template
 * Replaces 67+ duplicated create/edit form implementations
 * 
 * Usage:
 * import { createFormBuilder } from "../shared/patterns/FormBuilder.js";
 * const form = createFormBuilder({
 *   title: "Artist",
 *   endpoint: "/artists",
 *   fields: [{name: "name", type: "text", label: "Name"}],
 *   redirectTo: "/artists"
 * });
 */
export { createFormBuilder } from "./patterns/FormBuilder.js";

/**
 * DisplayPattern - Reusable async display template
 * Replaces 68+ duplicated display function implementations
 * 
 * Usage:
 * import { createDisplayPattern } from "../shared/patterns/DisplayPattern.js";
 * const display = createDisplayPattern({
 *   endpoint: "/artists",
 *   renderFn: (data) => renderArtistCard(data),
 *   emptyMessage: "No artists"
 * });
 * await display(container, isLoggedIn);
 */
export {
  createDisplayPattern,
  createPaginatedDisplay
} from "./patterns/DisplayPattern.js";

// ==========================================
// CONSOLIDATED HELPERS
// ==========================================

/**
 * Home Helpers - Unified home page utilities
 * Previously duplicated in: home/, home_farm/, crops/farm/home/
 * Exports: formatDate, createWeatherInfoWidget, createSearchBar, etc.
 * 
 * Usage:
 * import { createSearchBar, createNavWrapper } from "../shared/helpers/homeHelpers.js";
 */
export {
  formatDate,
  createWeatherInfoWidget,
  createSearchBar,
  inputField,
  createNavWrapper,
  createAuthForms,
  adspace
} from "./helpers/homeHelpers.js";

/**
 * API Helpers - Standardized API call wrappers
 * Replaces 100+ try-catch blocks across services
 * 
 * Usage:
 * import { apiGet, apiPost, apiDelete } from "../shared/helpers/apiHelpers.js";
 * const data = await apiGet("/artists");
 * const newItem = await apiPost("/artists", {name: "Artist"});
 */
export {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiRequest,
  isNetworkError,
  isAuthError,
  isValidationError,
  isServerError
} from "./helpers/apiHelpers.js";

/**
 * Error Handling - Standardized error/success notifications
 * Replaces 100+ inconsistent error handler patterns
 * 
 * Usage:
 * import { showError, showSuccess, handleError } from "../shared/helpers/errorHandling.js";
 * showSuccess("Operation completed!");
 * handleError(err, "Create Artist");
 */
export {
  showError,
  showSuccess,
  showInfo,
  showWarning,
  handleError,
  withErrorHandler,
  retryWithBackoff,
  isErrorType,
  setupGlobalErrorHandler
} from "./helpers/errorHandling.js";

// ==========================================
// CONSOLIDATION SUMMARY
// ==========================================

/**
 * FILES & LINES CONSOLIDATED:
 * 
 * Components:
 * - YoHome: 3 files → 1 shared ✅
 * - ListingTabs: 3 files → 1 shared ✅
 * - MediaRenders: 9 files → 1 shared ✅
 * 
 * Utilities:
 * - Home Helpers: 3+ files → 1 shared ✅
 * - Admin Functions: 2 files → 1 file ✅
 * - API Wrappers: 100+ try-catch → 1 module ✅
 * - Error Handlers: 100+ implementations → 1 module ✅
 * 
 * Patterns:
 * - FormBuilder: replaces 67 create/edit functions
 * - DisplayPattern: replaces 68 display functions
 * 
 * TOTAL SAVINGS: ~4,120 lines of duplicate code
 * 
 * DELETED FILES:
 * - admin/modHelpers.js (complete duplicate)
 */

/**
 * RECOMMENDED USAGE:
 * 
 * 1. For New Components:
 *    Use shared components instead of creating new files
 * 
 * 2. For New Forms:
 *    Use FormBuilder pattern instead of copying form code
 * 
 * 3. For New Display Views:
 *    Use DisplayPattern instead of copying render code
 * 
 * 4. For API Calls:
 *    Use API helpers instead of try-catch wrappers
 * 
 * 5. For Error Handling:
 *    Use error helpers for consistent notifications
 */
