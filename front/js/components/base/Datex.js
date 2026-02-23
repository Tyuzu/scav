import { createElement } from "../../components/createElement.js";

/**
 * Datex: returns a formatted date either as a DOM element or string
 * @param {string} DATE_TO_PRINT - ISO date string
 * @param {boolean} asString - if true, return a string instead of a <span>
 */
const Datex = (DATE_TO_PRINT = "2026-01-03T12:39:00Z", asString = false) => {
  const formatted = new Date(DATE_TO_PRINT).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  if (asString) return formatted;

  return createElement("span", {}, [formatted]);
};

export default Datex;
export { Datex };
