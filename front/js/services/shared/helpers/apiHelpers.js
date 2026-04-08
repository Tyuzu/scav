/**
 * Consolidated API Wrapper Utilities
 * Provides standardized API call functions with error handling
 * Reduces duplication of try-catch blocks across 100+ files
 */

/**
 * Enhanced GET request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Function} errorHandler - Optional custom error handler
 * @returns {Promise} Response data
 */
export async function apiGet(endpoint, errorHandler = null) {
  try {
    const apiFetch = window.apiFetch || (await import("../../api/api.js").then(m => m.apiFetch));
    const response = await apiFetch(endpoint);
    return response;
  } catch (err) {
    const errorMsg = `Failed to GET ${endpoint}`;
    console.error(errorMsg, err);

    if (errorHandler) {
      errorHandler(err, errorMsg);
    }

    throw err;
  }
}

/**
 * Enhanced POST request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Data to send
 * @param {Function} errorHandler - Optional custom error handler
 * @returns {Promise} Response data
 */
export async function apiPost(endpoint, payload, errorHandler = null) {
  try {
    const apiFetch = window.apiFetch || (await import("../../api/api.js").then(m => m.apiFetch));
    const response = await apiFetch(endpoint, "POST", payload);
    return response;
  } catch (err) {
    const errorMsg = `Failed to POST ${endpoint}`;
    console.error(errorMsg, err);

    if (errorHandler) {
      errorHandler(err, errorMsg);
    }

    throw err;
  }
}

/**
 * Enhanced PUT request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Data to send
 * @param {Function} errorHandler - Optional custom error handler
 * @returns {Promise} Response data
 */
export async function apiPut(endpoint, payload, errorHandler = null) {
  try {
    const apiFetch = window.apiFetch || (await import("../../api/api.js").then(m => m.apiFetch));
    const response = await apiFetch(endpoint, "PUT", payload);
    return response;
  } catch (err) {
    const errorMsg = `Failed to PUT ${endpoint}`;
    console.error(errorMsg, err);

    if (errorHandler) {
      errorHandler(err, errorMsg);
    }

    throw err;
  }
}

/**
 * Enhanced DELETE request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Function} errorHandler - Optional custom error handler
 * @returns {Promise} Response data
 */
export async function apiDelete(endpoint, errorHandler = null) {
  try {
    const apiFetch = window.apiFetch || (await import("../../api/api.js").then(m => m.apiFetch));
    const response = await apiFetch(endpoint, "DELETE");
    return response;
  } catch (err) {
    const errorMsg = `Failed to DELETE ${endpoint}`;
    console.error(errorMsg, err);

    if (errorHandler) {
      errorHandler(err, errorMsg);
    }

    throw err;
  }
}

/**
 * Generic API request wrapper
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {Object} payload - Optional data to send
 * @param {Object} options - Additional options {errorHandler, timeout, retries}
 * @returns {Promise} Response data
 */
export async function apiRequest(
  endpoint,
  method = "GET",
  payload = null,
  options = {}
) {
  const {
    errorHandler = null,
    timeout = null,
    retries = 1
  } = options;

  const attempt = async (retriesLeft) => {
    try {
      const apiFetch = window.apiFetch || (await import("../../api/api.js").then(m => m.apiFetch));

      let fetchPromise = apiFetch(endpoint, method, payload);

      // Add timeout if specified
      if (timeout) {
        fetchPromise = Promise.race([
          fetchPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), timeout)
          )
        ]);
      }

      return await fetchPromise;
    } catch (err) {
      if (retriesLeft > 0) {
        console.warn(`Retrying ${method} ${endpoint} (${retriesLeft} retries left)`);
        return attempt(retriesLeft - 1);
      }

      const errorMsg = `Failed to ${method} ${endpoint}`;
      console.error(errorMsg, err);

      if (errorHandler) {
        errorHandler(err, errorMsg);
      }

      throw err;
    }
  };

  return attempt(retries);
}

/**
 * Utility to check if an error is a network error
 * @param {Error} err - Error object
 * @returns {Boolean}
 */
export function isNetworkError(err) {
  return (
    err &&
    (err instanceof TypeError ||
      err.message?.includes("network") ||
      err.message?.includes("fetch") ||
      err.status === 0)
  );
}

/**
 * Utility to check if an error is an auth error (401/403)
 * @param {Error} err - Error object
 * @returns {Boolean}
 */
export function isAuthError(err) {
  return (
    err &&
    (err.status === 401 ||
      err.status === 403 ||
      err.message?.includes("Unauthorized") ||
      err.message?.includes("Forbidden"))
  );
}

/**
 * Utility to check if an error is a validation error (400)
 * @param {Error} err - Error object
 * @returns {Boolean}
 */
export function isValidationError(err) {
  return err && (err.status === 400 || err.message?.includes("validation"));
}

/**
 * Utility to check if an error is a server error (5xx)
 * @param {Error} err - Error object
 * @returns {Boolean}
 */
export function isServerError(err) {
  return err && err.status >= 500 && err.status < 600;
}
