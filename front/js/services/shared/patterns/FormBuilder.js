/**
 * Consolidated FormBuilder Pattern
 * Provides reusable template for create/edit form functionality
 * Currently duplicated across 67+ files with create/edit patterns
 */

import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";

/**
 * Creates a standard form builder for create/edit workflows
 * @param {Object} config - Configuration object
 * @param {string} config.title - Form title (e.g., "Create Artist", "Edit Event")
 * @param {string} config.endpoint - API endpoint base (e.g., "/artists")
 * @param {string} config.editId - Optional ID for edit mode (if not provided, mode is "create")
 * @param {Array<Object>} config.fields - Field definitions with {name, type, label, required, validation}
 * @param {Function} config.onSuccess - Callback after successful submission
 * @param {Function} config.onError - Callback for error handling
 * @param {Function} config.validator - Optional custom validation function
 * @param {string} config.redirectTo - URL to navigate to after success
 * @returns {HTMLElement} Form element
 */
export function createFormBuilder({
  title,
  endpoint,
  editId = null,
  fields = [],
  onSuccess = null,
  onError = null,
  validator = null,
  redirectTo = null
} = {}) {
  const isEditMode = !!editId;
  const formContainer = createElement("div", { class: "form-builder-wrapper" });

  // Title
  const titleEl = createElement("h2", { class: "form-title" }, [
    isEditMode ? `Edit ${title}` : `Create ${title}`
  ]);

  // Form element
  const form = createElement("form", { class: "form-builder", "data-mode": isEditMode ? "edit" : "create" });

  // Field placeholders
  const fieldElements = {};

  // Build form fields
  fields.forEach((fieldConfig) => {
    const {
      name,
      type = "text",
      label,
      required = false,
      validation = null,
      placeholder = "",
      options = []
    } = fieldConfig;

    const wrapper = createElement("div", { class: "form-field-wrapper" });
    const labelEl = createElement("label", { for: name }, [label || name]);

    let inputEl;
    if (type === "textarea") {
      inputEl = createElement("textarea", {
        id: name,
        name,
        placeholder,
        required: required ? "required" : undefined,
        rows: 4
      });
    } else if (type === "select") {
      inputEl = createElement("select", {
        id: name,
        name,
        required: required ? "required" : undefined
      });
      options.forEach((option) => {
        const optEl = createElement("option", { value: option.value }, [option.label]);
        inputEl.appendChild(optEl);
      });
    } else {
      inputEl = createElement("input", {
        id: name,
        name,
        type,
        placeholder,
        required: required ? "required" : undefined
      });
    }

    wrapper.append(labelEl, inputEl);
    form.appendChild(wrapper);
    fieldElements[name] = inputEl;
  });

  // Load existing data if in edit mode
  const loadExistingData = async () => {
    if (!isEditMode) return;

    try {
      const url = `${endpoint}/${editId}`;
      const data = await apiFetch(url);

      if (!data) throw new Error("Failed to load data");

      // Populate form with existing data
      Object.entries(fieldElements).forEach(([name, el]) => {
        if (data[name] !== undefined) {
          el.value = data[name];
        }
      });
    } catch (err) {
      console.error("Failed to load existing data:", err);
      showTemporaryError("Failed to load form data. Try reloading.");
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Collect form data
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Run custom validator if provided
    if (validator && !validator(payload)) {
      console.warn("Custom validation failed");
      if (onError) onError("Validation failed");
      return;
    }

    // Submit to API
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = isEditMode ? "Updating..." : "Creating...";

      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `${endpoint}/${editId}` : endpoint;

      const result = await apiFetch(url, method, payload);

      if (onSuccess) {
        onSuccess(result);
      } else {
        showTemporaryInfo(isEditMode ? "Updated successfully!" : "Created successfully!");
      }

      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err) {
      console.error("Form submission error:", err);
      showTemporaryError(err.message || "Failed to submit form");

      if (onError) {
        onError(err);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = isEditMode ? "Update" : "Create";
    }
  };

  // Buttons
  const buttonsWrapper = createElement("div", { class: "form-buttons" });
  const submitBtn = createElement("button", {
    type: "submit",
    class: "form-submit-btn"
  }, [isEditMode ? "Update" : "Create"]);

  const cancelBtn = createElement("button", {
    type: "button",
    class: "form-cancel-btn"
  }, ["Cancel"]);

  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(-1);
  });

  buttonsWrapper.append(submitBtn, cancelBtn);
  form.append(buttonsWrapper);

  // Attach form submission handler
  form.addEventListener("submit", handleSubmit);

  // Assemble
  formContainer.append(titleEl, form);

  // Load existing data if edit mode
  if (isEditMode) {
    loadExistingData();
  }

  return formContainer;
}

/**
 * Temporary message utilities
 * @private
 */
function showTemporaryError(msg, duration = 3000) {
  const errorDiv = createElement("div", { class: "form-error-message" }, [msg]);
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), duration);
}

function showTemporaryInfo(msg, duration = 2000) {
  const infoDiv = createElement("div", { class: "form-success-message" }, [msg]);
  document.body.appendChild(infoDiv);
  setTimeout(() => infoDiv.remove(), duration);
}
