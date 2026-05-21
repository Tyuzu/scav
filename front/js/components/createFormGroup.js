import { createElement } from "./createElement.js";
import { validateField } from "../validation/validators.js";

/**
 * REFACTORED: This now includes validation support built-in. 
 * This maintains backward compatibility while adding powerful validation features.
 * 
 * To add validation to any form, simply add a 'validator' property:
 * 
 * createFormGroup({
 *   id: "email",
 *   label: "Email",
 *   type: "email",
 *   validator: validators.email  // NEW - optional validation
 * })
 * 
 * See /validation/FORM_VALIDATION_GUIDE.md for complete documentation
 */

/**
 * Create a form group with optional validation support
 * Use this for all new forms - it includes validation and error display
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.type - Input type (text, email, number, file, select, etc.)
 * @param {string} config.id - Element ID and field identifier
 * @param {string} config.name - Form field name
 * @param {string} config.label - Display label
 * @param {string} config.value - Initial value
 * @param {string} config.placeholder - Placeholder text
 * @param {boolean} config.required - HTML required attribute
 * @param {string} config.accept - File accept filter
 * @param {Array} config.options - Options for select/multiselect
 * @param {boolean} config.multiple - Multiple selection/files
 * @param {Function} config.validator - Validation function (NEW)
 * @param {string} config.validationTrigger - When to validate: "blur", "change", "both" (NEW)
 * @param {Object} config.additionalProps - Extra HTML attributes
 * @param {Array} config.additionalNodes - Extra DOM elements
 * @returns {HTMLElement} Form group element with validation support
 * 
 * @example
 * // Simple usage (backward compatible)
 * createFormGroup({ id: "name", label: "Name", type: "text" })
 * 
 * // With validation (NEW)
 * createFormGroup({
 *   id: "email",
 *   label: "Email",
 *   type: "email",
 *   validator: validators.email,
 *   validationTrigger: "blur"
 * })
 */
export function createFormGroup({
  type = "text",
  id = "",
  name = "",
  label = "",
  value = "",
  placeholder = "",
  required = false,
  accept = "",
  options = [],
  multiple = false,
  validator = null,
  validationTrigger = "blur",
  additionalProps = {},
  additionalNodes = []
}) {
  const group = createElement("div", { class: "form-group" });

  if (label) {
    const labelAttrs = {};
    if (id) {
      labelAttrs.for = id;
    }
    const requiredSpan = required ? createElement("span", { class: "form-required" }, ["*"]) : null;
    const labelElement = createElement("label", labelAttrs, [label]);
    if (requiredSpan) {
      labelElement.appendChild(requiredSpan);
    }
    group.appendChild(labelElement);
  }

  const inputName = name || id || "";
  let inputElement;

  switch (type) {
    case "textarea":
      inputElement = createElement("textarea", {
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || ""
      });
      if (value !== undefined && value !== null) {
        inputElement.value = String(value);
      }
      break;

    case "select":
    case "multiselect":
      inputElement = createElement("select", {
        id: id || undefined,
        name: inputName || undefined
      });
      if (type === "multiselect" || multiple) {
        inputElement.multiple = true;
      }

      if (placeholder) {
        const placeholderOption = createElement("option", {
          value: "",
          disabled: true,
          selected: !value
        }, [placeholder]);
        inputElement.appendChild(placeholderOption);
      }

      options.forEach(opt => {
        const { value: optValue, label: optLabel } =
          typeof opt === "string" ? { value: opt, label: opt } : opt;

        const optionAttrs = { value: optValue };
        if (optValue === "" && !placeholder) {
          optionAttrs.disabled = true;
        }

        const option = createElement("option", optionAttrs, [optLabel]);

        const valueLower = Array.isArray(value)
          ? value.map(v => String(v).toLowerCase())
          : String(value).toLowerCase();

        if (
          (Array.isArray(value) && valueLower.includes(String(optValue).toLowerCase())) ||
          (!Array.isArray(value) && String(optValue).toLowerCase() === String(value).toLowerCase())
        ) {
          option.selected = true;
        }

        inputElement.appendChild(option);
      });
      break;

    case "number":
      inputElement = createElement("input", {
        type: "number",
        id: id || "",
        name: inputName || "",
        placeholder: placeholder || "",
        value: (value !== null && value !== "") ? Number(value) : ""
      });
      break;

    case "file":
      inputElement = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        accept: accept || undefined
      });
      if (multiple) {
        inputElement.multiple = true;
      }
      break;

    default:
      inputElement = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || "",
        value: (value !== null) ? String(value) : ""
      });
      if (accept) {
        inputElement.accept = accept;
      }
      if (type === "file" && multiple) {
        inputElement.multiple = true;
      }
      break;
  }

  if (required) {
    inputElement.required = true;
  }

  Object.entries(additionalProps).forEach(([key, val]) => {
    try {
      if (key in inputElement) {
        inputElement[key] = val;
      } else {
        inputElement.setAttribute(key, String(val));
      }
    } catch {
      inputElement.setAttribute(key, String(val));
    }
  });

  group.appendChild(inputElement);

  // NEW: Add validation support if validator is provided
  if (validator) {
    const errorElement = createElement("div", {
      class: "form-error",
      style: "display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"
    });

    const validateInput = () => {
      const fieldValue = type === "file" ? inputElement : inputElement.value;
      const error = validateField(fieldValue, validator);

      if (error) {
        errorElement.textContent = error;
        errorElement.style.display = "block";
        inputElement.classList.add("form-input-error");
      } else {
        errorElement.textContent = "";
        errorElement.style.display = "none";
        inputElement.classList.remove("form-input-error");
      }
    };

    // Attach validation listeners
    if (validationTrigger === "blur" || validationTrigger === "both") {
      inputElement.addEventListener("blur", validateInput);
    }

    if (validationTrigger === "change" || validationTrigger === "both") {
      inputElement.addEventListener("change", validateInput);
      inputElement.addEventListener("input", validateInput);
    }

    // Expose validation method
    inputElement.validate = validateInput;
    group.appendChild(errorElement);
  }

  // Append any additional nodes like character counters
  if (Array.isArray(additionalNodes)) {
    additionalNodes.forEach(node => group.appendChild(node));
  }

  return group;
}
