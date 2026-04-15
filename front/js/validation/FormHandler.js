/**
 * Form Handler Utility
 * Simplifies form creation, validation, data collection, and submission
 */

import { createElement } from "../components/createElement.js";
import { validateForm } from "./validators.js";

/**
 * FormHandler - Centralized form management
 * Handles validation, data collection, and submission
 * 
 * @example
 * const form = new FormHandler({
 *   id: "user-form",
 *   fields: [
 *     createFormGroupWithValidation({ id: "name", label: "Name", validator: ... })
 *   ],
 *   validationSchema: {
 *     name: validators.required
 *   },
 *   onSubmit: async (data) => {
 *     await api.post("/users", data);
 *   }
 * });
 */
export class FormHandler {
  constructor({
    id = "form",
    fields = [],
    validationSchema = null,
    onSubmit = null,
    onValidate = null,
    submitButtonText = "Submit",
    cancelButtonText = "Cancel",
    onCancel = null,
    showSubmitButton = true,
    showCancelButton = false,
    autoscrollToError = true,
    submitButtonClass = "buttonx",
    cancelButtonClass = "buttonx"
  } = {}) {
    this.id = id;
    this.fields = fields;
    this.validationSchema = validationSchema;
    this.onSubmit = onSubmit;
    this.onValidate = onValidate;
    this.submitButtonText = submitButtonText;
    this.cancelButtonText = cancelButtonText;
    this.onCancel = onCancel;
    this.showSubmitButton = showSubmitButton;
    this.showCancelButton = showCancelButton;
    this.autoscrollToError = autoscrollToError;
    this.submitButtonClass = submitButtonClass;
    this.cancelButtonClass = cancelButtonClass;
    this.formElement = null;
    this.inputElements = new Map();
    this.isSubmitting = false;
  }

  /**
   * Create and return the form element
   */
  createForm() {
    this.formElement = createElement("form", {
      id: this.id,
      class: "form-container",
      novalidate: "novalidate"
    });

    // Add fields
    this.fields.forEach(fieldElement => {
      const input = fieldElement.querySelector("input, textarea, select");
      if (input) {
        const fieldId = input.id || input.name;
        if (fieldId) {
          this.inputElements.set(fieldId, input);
        }
      }
      this.formElement.appendChild(fieldElement);
    });

    // Create button container
    const buttonContainer = createElement("div", { class: "form-buttons" });

    // Submit button
    if (this.showSubmitButton) {
      const submitBtn = createElement("button", {
        type: "submit",
        class: this.submitButtonClass,
        textContent: this.submitButtonText
      }, [this.submitButtonText]);
      submitBtn.addEventListener("click", (e) => this._handleSubmit(e));
      buttonContainer.appendChild(submitBtn);
      this.submitButton = submitBtn;
    }

    // Cancel button
    if (this.showCancelButton) {
      const cancelBtn = createElement("button", {
        type: "button",
        class: this.cancelButtonClass,
        textContent: this.cancelButtonText
      }, [this.cancelButtonText]);
      cancelBtn.addEventListener("click", () => this._handleCancel());
      buttonContainer.appendChild(cancelBtn);
      this.cancelButton = cancelBtn;
    }

    if (this.showSubmitButton || this.showCancelButton) {
      this.formElement.appendChild(buttonContainer);
    }

    return this.formElement;
  }

  /**
   * Validate all form fields
   */
  validate() {
    const data = this.getData();
    
    // If schema-based validation exists
    if (this.validationSchema) {
      const errors = validateForm(data, this.validationSchema);
      if (Object.keys(errors).length > 0) {
        this._showErrors(errors);
        return false;
      }
    }

    // Validate individual field validators
    let isValid = true;
    this.inputElements.forEach((input) => {
      if (input.validate) {
        const fieldValid = input.validate();
        if (!fieldValid) isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Get form data as object
   */
  getData() {
    const data = {};
    this.inputElements.forEach((input, fieldId) => {
      const name = input.name || fieldId;
      
      if (input.type === "checkbox") {
        data[name] = input.checked;
      } else if (input.type === "file") {
        data[name] = input.files;
      } else if (input.type === "number") {
        data[name] = input.value ? Number(input.value) : null;
      } else {
        data[name] = input.value;
      }
    });
    return data;
  }

  /**
   * Set form data
   */
  setData(data) {
    Object.entries(data).forEach(([key, value]) => {
      const input = Array.from(this.inputElements.values()).find(
        i => i.name === key || i.id === key
      );
      
      if (input) {
        if (input.type === "checkbox") {
          input.checked = value;
        } else if (input.type === "file") {
          // Can't set file input value for security
          return;
        } else {
          input.value = value || "";
        }
      }
    });
  }

  /**
   * Reset form to initial state
   */
  reset() {
    if (this.formElement) {
      this.formElement.reset();
    }
    this.clearErrors();
  }

  /**
   * Clear all error messages
   */
  clearErrors() {
    const errorElements = this.formElement?.querySelectorAll(".form-error");
    if (errorElements) {
      errorElements.forEach(el => {
        el.textContent = "";
        el.style.display = "none";
      });
    }
    const inputElements = this.formElement?.querySelectorAll(".form-input-error");
    if (inputElements) {
      inputElements.forEach(el => {
        el.classList.remove("form-input-error");
      });
    }
  }

  /**
   * Disable form inputs
   */
  setDisabled(disabled) {
    this.inputElements.forEach(input => {
      input.disabled = disabled;
    });
    if (this.submitButton) {
      this.submitButton.disabled = disabled;
    }
  }

  /**
   * Handle form submission
   */
  async _handleSubmit(e) {
    e.preventDefault();

    if (this.isSubmitting) return;

    // Validate
    if (!this.validate()) {
      if (this.autoscrollToError) {
        const firstError = this.formElement?.querySelector(".form-error[style*='display: block']");
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (this.onValidate) {
        this.onValidate(false);
      }
      return;
    }

    if (this.onValidate) {
      this.onValidate(true);
    }

    if (!this.onSubmit) {
      return;
    }

    try {
      this.isSubmitting = true;
      this.setDisabled(true);

      const data = this.getData();
      await this.onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      throw error;
    } finally {
      this.isSubmitting = false;
      this.setDisabled(false);
    }
  }

  /**
   * Handle cancel
   */
  _handleCancel() {
    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Display errors for fields
   */
  _showErrors(errors) {
    Object.entries(errors).forEach(([fieldId, errorMessage]) => {
      const input = this.inputElements.get(fieldId);
      if (input) {
        const errorEl = input.parentElement?.querySelector(".form-error");
        const group = input.parentElement;
        
        if (errorEl) {
          errorEl.textContent = errorMessage;
          errorEl.style.display = "block";
        }
        
        if (group) {
          input.classList.add("form-input-error");
        }
      }
    });
  }
}

/**
 * Quick form creation helper
 * @example
 * const form = createFormWithValidation({
 *   fields: [
 *     { id: "name", label: "Name", validator: validators.required }
 *   ],
 *   onSubmit: async (data) => api.post("/users", data)
 * });
 */
export function createFormWithValidation(config) {
  const handler = new FormHandler(config);
  return handler.createForm();
}
