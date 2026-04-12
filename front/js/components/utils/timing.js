/**
 * Debounce and Throttle Utilities
 * Controls the frequency of function calls
 */

/**
 * Debounce - delays function execution until after delay ms of inactivity
 * @param {Function} func - Function to debounce
 * @param {number} delay - Milliseconds to wait before executing
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Call on leading edge (default: false)
 * @param {boolean} options.trailing - Call on trailing edge (default: true)
 * @param {number} options.maxWait - Max time to wait before force calling
 * @returns {Function} Debounced function with cancel method
 */
export function debounce(func, delay, options = {}) {
  const { leading = false, trailing = true, maxWait = null } = options;
  
  let timeoutId = null;
  let lastCallTime = null;
  let lastInvokeTime = 0;
  let lastResult = null;
  let leadingEdge = false;

  const invokeFunc = (time) => {
    lastResult = func();
    lastInvokeTime = time;
    return lastResult;
  };

  const debounced = function(...args) {
    const time = Date.now();

    if (!lastCallTime && leading) {
      leadingEdge = true;
      invokeFunc(time);
    }

    lastCallTime = time;

    if (timeoutId) clearTimeout(timeoutId);

    if (maxWait !== null) {
      const timeSinceLastInvoke = time - lastInvokeTime;
      if (timeSinceLastInvoke >= maxWait) {
        invokeFunc(time);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }
    }

    if (trailing) {
      timeoutId = setTimeout(() => {
        invokeFunc(Date.now());
        timeoutId = null;
        lastCallTime = null;
      }, delay);
    }
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastCallTime = null;
  };

  debounced.flush = () => {
    if (timeoutId) {
      invokeFunc(Date.now());
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCallTime = null;
    }
  };

  return debounced;
}

/**
 * Throttle - ensures function is called at most once per delay ms
 * @param {Function} func - Function to throttle
 * @param {number} delay - Milliseconds between invocations
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Call on leading edge (default: true)
 * @param {boolean} options.trailing - Call on trailing edge (default: true)
 * @returns {Function} Throttled function with cancel method
 */
export function throttle(func, delay, options = {}) {
  const { leading = true, trailing = true } = options;
  
  let timeoutId = null;
  let lastInvokeTime = 0;
  let lastResult = null;
  let lastArgs = null;

  const invokeFunc = (time) => {
    lastResult = func(...(lastArgs || []));
    lastInvokeTime = time;
    return lastResult;
  };

  const throttled = function(...args) {
    const time = Date.now();
    const timeSinceLastInvoke = time - lastInvokeTime;

    lastArgs = args;

    if (lastInvokeTime === 0 && !leading) {
      lastInvokeTime = time;
    }

    if (timeSinceLastInvoke >= delay) {
      invokeFunc(time);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        invokeFunc(Date.now());
        lastInvokeTime = leading ? Date.now() : 0;
        timeoutId = null;
      }, delay - timeSinceLastInvoke);
    }
  };

  throttled.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastInvokeTime = 0;
  };

  throttled.flush = () => {
    if (timeoutId || lastInvokeTime > 0) {
      invokeFunc(Date.now());
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}

/**
 * AnimationFrame-based throttle for smooth animations
 * @param {Function} func - Function to throttle
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Call on leading edge (default: true)
 * @returns {Function} RAF throttled function
 */
export function rafThrottle(func, options = {}) {
  const { leading = true } = options;
  let rafId = null;
  let lastArgs = null;
  let shouldCall = leading;

  const throttled = function(...args) {
    lastArgs = args;

    if (shouldCall) {
      func(...args);
      shouldCall = false;
    }

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        func(...lastArgs);
        shouldCall = true;
        rafId = null;
      });
    }
  };

  throttled.cancel = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}
