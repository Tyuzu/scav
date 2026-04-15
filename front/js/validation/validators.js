/**
 * Reusable Validators
 * Core validation functions for common input types
 */

// String validators
export const validators = {
  // Required field
  required: (value) => {
    const trimmed = String(value || "").trim();
    return trimmed.length > 0 ? null : "This field is required";
  },

  // Email validation
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : "Invalid email address";
  },

  // URL validation
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return "Invalid URL";
    }
  },

  // Phone validation (basic)
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, "").length >= 10
      ? null
      : "Invalid phone number";
  },

  // Number validation
  number: (value) => {
    if (value === "" || value === null || value === undefined) return null;
    return isNaN(value) ? "Must be a valid number" : null;
  },

  // Integer only
  integer: (value) => {
    if (value === "" || value === null || value === undefined) return null;
    return !Number.isInteger(Number(value)) ? "Must be a whole number" : null;
  },

  // Min value
  min: (min) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return num < min ? `Must be at least ${min}` : null;
  },

  // Max value
  max: (max) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return num > max ? `Must not exceed ${max}` : null;
  },

  // Range validation
  range: (min, max) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    if (num < min || num > max) return `Must be between ${min} and ${max}`;
    return null;
  },

  // Min length
  minLength: (len) => (value) => {
    const str = String(value || "").trim();
    return str.length < len ? `Must be at least ${len} characters` : null;
  },

  // Max length
  maxLength: (len) => (value) => {
    const str = String(value || "").trim();
    return str.length > len ? `Must not exceed ${len} characters` : null;
  },

  // Pattern/Regex
  pattern: (regex, message = "Invalid format") => (value) => {
    if (!value) return null;
    return regex.test(value) ? null : message;
  },

  // File validators
  fileType: (allowedTypes) => (files) => {
    if (!files || files.length === 0) return null;
    const file = files[0];
    const isValid = allowedTypes.some(type => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type);
      }
      return file.type.startsWith(type);
    });
    return isValid ? null : `File type not allowed. Accepted: ${allowedTypes.join(", ")}`;
  },

  // File size (in bytes)
  fileSize: (maxSizeBytes) => (files) => {
    if (!files || files.length === 0) return null;
    const file = files[0];
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
    return file.size > maxSizeBytes ? `File size must not exceed ${maxSizeMB}MB` : null;
  },

  // Date validators
  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? "Invalid date" : null;
  },

  // Min date (no earlier than)
  minDate: (minDate) => (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Invalid date";
    const min = new Date(minDate);
    return date < min ? `Date must be on or after ${minDate}` : null;
  },

  // Max date (no later than)
  maxDate: (maxDate) => (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Invalid date";
    const max = new Date(maxDate);
    return date > max ? `Date must be on or before ${maxDate}` : null;
  },

  // Custom validator
  custom: (fn, message = "Invalid value") => (value) => {
    try {
      return fn(value) ? null : message;
    } catch (err) {
      return message;
    }
  },

  // Compound validator - all must pass
  compose: (...fns) => (value) => {
    for (const fn of fns) {
      const result = fn(value);
      if (result) return result;
    }
    return null;
  },

  // Or validator - at least one must pass
  or: (...fns) => (value) => {
    const errors = [];
    for (const fn of fns) {
      const result = fn(value);
      if (!result) return null;
      errors.push(result);
    }
    return errors[0];
  }
};

/**
 * Validate a single field against one or more validators
 * @param {*} value - The value to validate
 * @param {Function|Function[]} validator - Validator function or array of validators
 * @returns {string|null} - Error message or null if valid
 */
export function validateField(value, validator) {
  if (!validator) return null;

  const validators_arr = Array.isArray(validator) ? validator : [validator];
  for (const v of validators_arr) {
    const error = v(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate multiple fields at once
 * @param {Object} data - Object containing field values
 * @param {Object} schema - validation schema { fieldName: validator }
 * @returns {Object} - { fieldName: errorMessage, ... }
 */
export function validateForm(data, schema) {
  const errors = {};
  
  for (const [fieldName, validator] of Object.entries(schema)) {
    const error = validateField(data[fieldName], validator);
    if (error) errors[fieldName] = error;
  }
  
  return errors;
}
