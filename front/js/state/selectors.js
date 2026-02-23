/**
 * State Selectors with Memoization
 * Prevents unnecessary re-renders by caching derived state
 */

const selectorCache = new Map();

/**
 * Create a memoized selector
 * @param {string} key - Unique cache key
 * @param {Function} selector - Function to compute derived state
 * @param {Function} equalityFn - Optional custom equality check (default: === reference)
 * @returns {Function} Memoized selector
 */
export function createSelector(key, selector, equalityFn = (a, b) => a === b) {
  return function memoizedSelector(...args) {
    const cached = selectorCache.get(key);
    const newResult = selector(...args);
    
    if (cached && equalityFn(cached.result, newResult)) {
      return cached.result;
    }
    
    selectorCache.set(key, { result: newResult });
    return newResult;
  };
}

/**
 * Common selectors
 */

export const getUserId = createSelector("userId", (state) => state?.user?.id || state?.user, (a, b) => a === b);

export const getUsername = createSelector("username", (state) => state?.username || state?.user?.username, (a, b) => a === b);

export const isAuthenticated = createSelector(
  "isAuthenticated",
  (state) => Boolean(state?.token),
  (a, b) => a === b
);

export const getRoles = createSelector(
  "roles",
  (state) => {
    const role = state?.userProfile?.role || state?.role;
    return Array.isArray(role) ? role : role ? [role] : [];
  },
  (a, b) => Array.isArray(a) && Array.isArray(b) && a.every((x, i) => x === b[i])
);

export const getUserProfile = createSelector(
  "userProfile",
  (state) => state?.userProfile ? { ...state.userProfile } : {},
  (a, b) => JSON.stringify(a) === JSON.stringify(b)
);

export const getIsLoading = createSelector("isLoading", (state) => Boolean(state?.isLoading), (a, b) => a === b);

export const getLanguage = createSelector("lang", (state) => state?.lang || "en", (a, b) => a === b);

export const getCurrentRoute = createSelector("currentRoute", (state) => state?.currentRoute || "/", (a, b) => a === b);

/**
 * Clear cache (useful for reset)
 */
export function clearSelectorCache() {
  selectorCache.clear();
}

/**
 * Preload selectors (call with state object at app start)
 */
export function preloadSelectors(state) {
  if (!state) return;
  getUserId(state);
  getUsername(state);
  isAuthenticated(state);
  getRoles(state);
  getUserProfile(state);
  getIsLoading(state);
  getLanguage(state);
  getCurrentRoute(state);
}
