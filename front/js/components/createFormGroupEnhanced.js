/**
 * Enhanced Form Group with Built-in Validation
 * Drop-in replacement for createFormGroup with validation and error display
 */

import { createElement } from "./createElement.js";
import { validateField } from "../validation/validators.js";

export function createFormGroupWithValidation({
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
  validationTrigger = "blur", // "blur", "change", or "both"
  additionalProps = {},
  additionalNodes = [],
  onValidationChange = null, // Callback when validation state changes
}) {
  const group = createElement("div", { class: "form-group" });
  const inputName = name || id || "";
  let inputElement;

  // Create label
  if (label) {
    const labelAttrs = {};
    if (id) labelAttrs.for = id;
    const requiredSpan = required ? createElement("span", { class: "form-required" }, ["*"]) : null;
    const labelElement = createElement("label", labelAttrs, [label]);
    if (requiredSpan) labelElement.appendChild(requiredSpan);
    group.appendChild(labelElement);
  }

  // Create input element based on type
  switch (type) {
    case "textarea":
      inputElement = createElement("textarea", {
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || undefined
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
        value: (value != null && value !== "") ? Number(value) : ""
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
        placeholder: placeholder || undefined,
        value: (value != null) ? String(value) : ""
      });
      if (accept) {
        inputElement.accept = accept;
      }
      if (type === "file" && multiple) {
        inputElement.multiple = true;
      }
      break;
  }

  // Apply required attribute
  if (required) {
    inputElement.required = true;
  }

  // Apply additional properties
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

  // Create error message element
  const errorElement = createElement("div", {
    class: "form-error",
    style: "display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"
  });

  // Create hidden input to track validation state
  const validationStateInput = document.createElement("input");
  validationStateInput.type = "hidden";
  validationStateInput.className = "form-validation-state";
  validationStateInput.value = "valid";

  // Validation function
  const validateInput = () => {
    if (!validator) return true;

    const fieldValue = type === "file" ? inputElement : inputElement.value;
    const error = validateField(fieldValue, validator);

    if (error) {
      errorElement.textContent = error;
      errorElement.style.display = "block";
      inputElement.classList.add("form-input-error");
      validationStateInput.value = "invalid";
    } else {
      errorElement.textContent = "";
      errorElement.style.display = "none";
      inputElement.classList.remove("form-input-error");
      validationStateInput.value = "valid";
    }

    if (onValidationChange) {
      onValidationChange(!error);
    }

    return !error;
  };

  // Attach validation listeners
  if (validator) {
    const validateOn = () => {
      // Debounce for better UX
      if (inputElement._validateTimeout) {
        clearTimeout(inputElement._validateTimeout);
      }
      inputElement._validateTimeout = setTimeout(validateInput, 300);
    };

    if (validationTrigger === "blur" || validationTrigger === "both") {
      inputElement.addEventListener("blur", validateInput);
    }

    if (validationTrigger === "change" || validationTrigger === "both") {
      inputElement.addEventListener("change", validateOn);
      inputElement.addEventListener("input", validateOn);
    }
  }

  // Expose validation method
  inputElement.validate = validateInput;
  inputElement.isValid = () => validationStateInput.value === "valid";
  inputElement.getError = () => errorElement.textContent;

  // Append elements
  group.appendChild(inputElement);
  group.appendChild(errorElement);
  group.appendChild(validationStateInput);

  // Append additional nodes
  if (Array.isArray(additionalNodes)) {
    additionalNodes.forEach(node => group.appendChild(node));
  }

  return group;
}

/**
 * Backward compatible wrapper - use enhanced version by default
 */
export function createFormGroup(config) {
  return createFormGroupWithValidation(config);
}
