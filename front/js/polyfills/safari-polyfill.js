// polyfill examples
if (!Element.prototype.closest) {
    Element.prototype.closest = function(selector) {
      let el = this;
      while (el && el.nodeType === 1) {
        if (el.matches(selector)) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }
  
  // Add any other polyfills Safari might lack
  