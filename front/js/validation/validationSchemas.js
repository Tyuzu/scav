/**
 * Common Validation Schemas
 * Pre-built validation schema patterns for common field types
 */

import { validators } from "./validators.js";

export const validationSchemas = {
  // Text fields
  text: {
    required: (label) => validators.compose(
      validators.required,
      validators.minLength(1)
    ),
    email: () => validators.compose(validators.required, validators.email),
    url: () => validators.compose(validators.required, validators.url),
    phone: () => validators.compose(validators.required, validators.phone),
    slug: () => validators.compose(
      validators.required,
      validators.pattern(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    ),
    password: () => validators.compose(
      validators.required,
      validators.minLength(8),
      validators.pattern(/[A-Z]/, "Must contain at least one uppercase letter"),
      validators.pattern(/[0-9]/, "Must contain at least one number"),
      validators.pattern(/[^A-Za-z0-9]/, "Must contain at least one special character")
    ),
  },

  // Numbers
  number: {
    required: () => validators.compose(validators.required, validators.number),
    integer: () => validators.compose(validators.required, validators.integer),
    positive: () => validators.compose(
      validators.required,
      validators.number,
      validators.min(0)
    ),
    price: () => validators.compose(
      validators.required,
      validators.number,
      validators.min(0)
    ),
    percentage: () => validators.compose(
      validators.required,
      validators.number,
      validators.range(0, 100)
    ),
    rating: () => validators.compose(
      validators.required,
      validators.number,
      validators.range(1, 5)
    ),
  },

  // Dates
  date: {
    required: () => validators.compose(validators.required, validators.date),
    future: () => validators.compose(
      validators.required,
      validators.date,
      (value) => {
        const date = new Date(value);
        return date > new Date() ? null : "Date must be in the future";
      }
    ),
    past: () => validators.compose(
      validators.required,
      validators.date,
      (value) => {
        const date = new Date(value);
        return date < new Date() ? null : "Date must be in the past";
      }
    ),
  },

  // Files
  file: {
    required: (acceptedTypes = ["*/*"]) => validators.compose(
      (value) => !value || (value.files && value.files.length === 0) ? "File is required" : null,
      validators.fileType(acceptedTypes)
    ),
    image: () => validators.compose(
      (value) => !value || (value.files && value.files.length === 0) ? "Image is required" : null,
      validators.fileType(["image/jpeg", "image/png", "image/webp", "image/gif"])
    ),
    imageOptional: () => validators.fileType(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    audio: () => validators.compose(
      (value) => !value || (value.files && value.files.length === 0) ? "Audio file is required" : null,
      validators.fileType(["audio/mpeg", "audio/wav", "audio/ogg", "audio/m4a"])
    ),
    video: () => validators.compose(
      (value) => !value || (value.files && value.files.length === 0) ? "Video is required" : null,
      validators.fileType(["video/mp4", "video/webm", "video/quicktime"])
    ),
    document: () => validators.fileType([".pdf", ".doc", ".docx", ".txt"]),
    maxSize: (bytes) => validators.fileSize(bytes),
  },

  // Select
  select: {
    required: () => validators.compose(
      validators.required,
      (value) => !value || value === "" ? "Please select an option" : null
    ),
  },

  // Checkbox
  checkbox: {
    required: () => (value) => value ? null : "You must agree to this",
  },

  // Textarea
  textarea: {
    required: () => validators.compose(validators.required, validators.minLength(1)),
    minWords: (words) => (value) => {
      const wordCount = String(value || "").trim().split(/\s+/).length;
      return wordCount >= words ? null : `Must contain at least ${words} words`;
    },
  }
};

/**
 * Create a reusable field validation schema
 * @example
 * const schema = createValidationSchema({
 *   name: validationSchemas.text.required(),
 *   email: validationSchemas.text.email(),
 *   price: validationSchemas.number.price(),
 *   bio: validators.maxLength(500)
 * });
 */
export function createValidationSchema(schemaObj) {
  return schemaObj;
}
