/**
 * Consolidated Error Handling Utilities
 * Provides standardized error handling across services
 * Standardizes 100+ inconsistent error handler patterns
 */

/**
 * Standard error message display
 * @param {string} message - Error message to display
 * @param {HTMLElement} container - Container to append error message to (defaults to body)
 * @param {number} duration - How long to display error in ms (default: 3000)
 */
export function showError(
  message = "An error occurred",
  container = null,
  duration = 3000
) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-notification";
  errorDiv.setAttribute("role", "alert");
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 12px 20px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  const target = container || document.body;
  target.appendChild(errorDiv);

  if (duration > 0) {
    setTimeout(() => {
      errorDiv.remove();
    }, duration);
  }

  return errorDiv;
}

/**
 * Standard success message display
 * @param {string} message - Success message to display
 * @param {HTMLElement} container - Container to append message to (defaults to body)
 * @param {number} duration - How long to display message in ms (default: 2000)
 */
export function showSuccess(
  message = "Success!",
  container = null,
  duration = 2000
) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-notification";
  successDiv.setAttribute("role", "status");
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    padding: 12px 20px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  const target = container || document.body;
  target.appendChild(successDiv);

  if (duration > 0) {
    setTimeout(() => {
      successDiv.remove();
    }, duration);
  }

  return successDiv;
}

/**
 * Standard info message display
 * @param {string} message - Info message to display
 * @param {HTMLElement} container - Container to append message to (defaults to body)
 * @param {number} duration - How long to display message in ms (default: 2000)
 */
export function showInfo(
  message = "Information",
  container = null,
  duration = 2000
) {
  const infoDiv = document.createElement("div");
  infoDiv.className = "info-notification";
  infoDiv.setAttribute("role", "status");
  infoDiv.textContent = message;
  infoDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
    border-radius: 4px;
    padding: 12px 20px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  const target = container || document.body;
  target.appendChild(infoDiv);

  if (duration > 0) {
    setTimeout(() => {
      infoDiv.remove();
    }, duration);
  }

  return infoDiv;
}

/**
 * Standard warning message display
 * @param {string} message - Warning message to display
 * @param {HTMLElement} container - Container to append message to (defaults to body)
 * @param {number} duration - How long to display message in ms (default: 3000)
 */
export function showWarning(
  message = "Warning",
  container = null,
  duration = 3000
) {
  const warningDiv = document.createElement("div");
  warningDiv.className = "warning-notification";
  warningDiv.setAttribute("role", "alert");
  warningDiv.textContent = message;
  warningDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 12px 20px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  const target = container || document.body;
  target.appendChild(warningDiv);

  if (duration > 0) {
    setTimeout(() => {
      warningDiv.remove();
    }, duration);
  }

  return warningDiv;
}

/**
 * Error handler wrapper with logging and notification
 * @param {Error} err - Error object
 * @param {string} context - Where the error occurred (for logging)
 * @param {Object} options - Options {showUI, container, duration}
 */
export function handleError(
  err,
  context = "Unknown",
  options = {}
) {
  const {
    showUI = true,
    container = null,
    duration = 3000,
    logToServer = false
  } = options;

  const errorMessage = err?.message || String(err) || "An unknown error occurred";
  const fullMessage = `[${context}] ${errorMessage}`;

  // Always log to console
  console.error(fullMessage, err);

  // Optionally log to server
  if (logToServer && window.logErrorToServer) {
    window.logErrorToServer({
      message: fullMessage,
      stack: err?.stack,
      context,
      timestamp: new Date().toISOString()
    }).catch((serverErr) => {
      console.error("Failed to log error to server:", serverErr);
    });
  }

  // Show UI notification if requested
  if (showUI) {
    showError(errorMessage, container, duration);
  }

  return err;
}

/**
 * Async wrapper for error handling
 * Wraps async functions with standard error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Error context/label
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandler(fn, context = "Operation", options = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      handleError(err, context, options);
      throw err;
    }
  };
}

/**
 * Retry logic with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise} Result of function
 */
export async function retryWithBackoff(
  fn,
  maxRetries = 3,
  baseDelay = 1000
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          err
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is a specific type
 * @param {Error} err - Error object
 * @param {string} errorType - Type to check: 'network', 'auth', 'validation', 'server'
 * @returns {Boolean}
 */
export function isErrorType(err, errorType) {
  switch (errorType) {
    case "network":
      return (
        err instanceof TypeError ||
        err.message?.includes("network") ||
        err.message?.includes("fetch")
      );
    case "auth":
      return err.status === 401 || err.status === 403;
    case "validation":
      return err.status === 400;
    case "server":
      return err.status >= 500;
    case "timeout":
      return err.message?.includes("timeout");
    default:
      return false;
  }
}

/**
 * Global error boundary for unhandled promise rejections
 * Call this once in app initialization
 */
export function setupGlobalErrorHandler() {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    showError(
      "An unexpected error occurred. Please refresh the page.",
      null,
      5000
    );
  });

  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
    showError(
      "An unexpected error occurred. Please refresh the page.",
      null,
      5000
    );
  });
}
