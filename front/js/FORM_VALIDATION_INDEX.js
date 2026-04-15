/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FORM VALIDATION SYSTEM - INDEX & QUICK REFERENCE
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * A comprehensive, DRY solution for form creation, validation, and handling.
 * This system eliminates repetitive validation code across the codebase while
 * providing a consistent, user-friendly validation experience.
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 📁 FILE STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validation System Files
 * 
 * /validation/
 *   ├── validators.js                    ← Core validator functions
 *   ├── validationSchemas.js             ← Pre-built validation patterns
 *   └── FormHandler.js                   ← Complete form management
 * 
 * /components/
 *   ├── createFormGroup.js               ← Enhanced (with validation)
 *   └── createFormGroupEnhanced.js       ← Alias for enhanced version
 * 
 * /css/
 *   └── forms.css                        ← Styling for forms
 * 
 * /documentation/
 *   ├── FORM_VALIDATION_GUIDE.md         ← Complete documentation
 *   ├── MIGRATION_CHECKLIST.js           ← How to migrate existing forms
 *   └── Form Validation System - INDEX.js ← This file
 */


// ─────────────────────────────────────────────────────────────────────────────
// 🚀 QUICK START
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OPTION 1: Add validation to existing form fields
 */
import { createFormGroup } from './components/createFormGroup.js';
import { validators } from './validation/validators.js';

// Just add a validator prop - everything else stays the same
const emailField = createFormGroup({
  id: "email",
  label: "Email",
  type: "email",
  validator: validators.email,      // ← NEW: Validation
  validationTrigger: "blur"          // ← NEW: When to validate
});

/**
 * OPTION 2: Use form schemas for consistency
 */
import { validationSchemas } from './validation/validationSchemas.js';

const priceField = createFormGroup({
  id: "price",
  label: "Price",
  type: "number",
  validator: validationSchemas.number.price(),  // ← Pre-built schema
  additionalProps: { min: 0, step: "0.01" }
});

/**
 * OPTION 3: Complete form with validation (recommended for new forms)
 */
import { FormHandler } from './validation/FormHandler.js';

const handler = new FormHandler({
  submitButtonText: "Create",
  fields: [
    createFormGroup({
      id: "name",
      label: "Name",
      validator: validators.required
    }),
    createFormGroup({
      id: "email",
      label: "Email",
      type: "email",
      validator: validationSchemas.text.email()
    })
  ],
  onSubmit: async (data) => {
    // data is auto-validated, no need to check manually
    await api.post("/users", data);
  }
});

const form = handler.createForm();


// ─────────────────────────────────────────────────────────────────────────────
// 📚 API REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validators.js - Core Validation Functions
 * 
 * STRING VALIDATORS
 *   required(value)                      ← Not empty
 *   email(value)                         ← Valid email format
 *   url(value)                           ← Valid URL
 *   phone(value)                         ← Valid phone number
 *   minLength(n)(value)                  ← At least n characters
 *   maxLength(n)(value)                  ← Max n characters
 *   pattern(regex, msg)(value)           ← Regex pattern match
 * 
 * NUMBER VALIDATORS
 *   number(value)                        ← Is valid number
 *   integer(value)                       ← Is whole number
 *   min(n)(value)                        ← >= n
 *   max(n)(value)                        ← <= n
 *   range(min, max)(value)               ← Between min-max
 * 
 * FILE VALIDATORS
 *   fileType([types])(files)             ← Check file type
 *   fileSize(bytes)(files)               ← Check file size
 * 
 * DATE VALIDATORS
 *   date(value)                          ← Valid date format
 *   minDate(date)(value)                 ← On or after date
 *   maxDate(date)(value)                 ← On or before date
 * 
 * COMPOSITE VALIDATORS
 *   compose(...validators)(value)        ← All must pass
 *   or(...validators)(value)             ← At least one passes
 */

/**
 * validationSchemas.js - Pre-built Schemas
 * 
 * TEXT SCHEMAS
 *   validationSchemas.text.required()    ← Non-empty text
 *   validationSchemas.text.email()       ← Email validation
 *   validationSchemas.text.url()         ← URL validation
 *   validationSchemas.text.phone()       ← Phone validation
 *   validationSchemas.text.password()    ← Strong password
 *   validationSchemas.text.slug()        ← URL-friendly slug
 * 
 * NUMBER SCHEMAS
 *   validationSchemas.number.required()  ← Required number
 *   validationSchemas.number.integer()   ← Integer only
 *   validationSchemas.number.price()     ← Price >= 0
 *   validationSchemas.number.percentage()← 0-100
 *   validationSchemas.number.rating()    ← 1-5
 * 
 * DATE SCHEMAS
 *   validationSchemas.date.required()    ← Required date
 *   validationSchemas.date.future()      ← Future date only
 *   validationSchemas.date.past()        ← Past date only
 * 
 * FILE SCHEMAS
 *   validationSchemas.file.image()       ← Required image
 *   validationSchemas.file.imageOptional()← Optional image
 *   validationSchemas.file.audio()       ← Required audio
 *   validationSchemas.file.video()       ← Required video
 *   validationSchemas.file.document()    ← PDF/DOC files
 * 
 * SELECT SCHEMAS
 *   validationSchemas.select.required()  ← Required select
 */

/**
 * FormHandler - Complete Form Management
 * 
 * Methods:
 *   handler.createForm()                 ← Create form element
 *   handler.getData()                    ← Get form data object
 *   handler.setData(obj)                 ← Pre-populate form
 *   handler.validate()                   ← Validate all fields
 *   handler.reset()                      ← Reset to initial state
 *   handler.clearErrors()                ← Clear error messages
 *   handler.setDisabled(bool)            ← Enable/disable form
 * 
 * Events/Callbacks:
 *   onSubmit(data)                       ← Form submitted (async)
 *   onCancel()                           ← Cancel button clicked
 *   onValidate(isValid)                  ← Validation result
 */


// ─────────────────────────────────────────────────────────────────────────────
// 💡 COMMON PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATTERN 1: Simple field with validation
 */
function example1() {
  const field = createFormGroup({
    id: "email",
    label: "Email Address",
    type: "email",
    placeholder: "user@example.com",
    required: true,
    validator: validators.email,
    validationTrigger: "blur"
  });
  return field;
}

/**
 * PATTERN 2: Number field with min/max
 */
function example2() {
  const field = createFormGroup({
    id: "rating",
    label: "Rate this (1-5)",
    type: "number",
    validator: validationSchemas.number.rating(),
    additionalProps: { min: 1, max: 5 }
  });
  return field;
}

/**
 * PATTERN 3: File upload with validation
 */
function example3() {
  const field = createFormGroup({
    id: "image",
    label: "Upload Profile Picture",
    type: "file",
    validator: validators.compose(
      validationSchemas.file.image(),
      validators.fileSize(5 * 1024 * 1024) // 5MB limit
    ),
    validationTrigger: "change"
  });
  return field;
}

/**
 * PATTERN 4: Complex form with multiple validations
 */
function example4() {
  const handler = new FormHandler({
    id: "profile-form",
    submitButtonText: "Save Profile",
    showCancelButton: true,
    fields: [
      createFormGroup({
        id: "username",
        label: "Username",
        validator: validators.compose(
          validators.required,
          validators.minLength(3),
          validators.pattern(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _, and -")
        ),
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "email",
        label: "Email",
        type: "email",
        validator: validators.email,
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "bio",
        label: "Bio",
        type: "textarea",
        validator: validators.maxLength(500),
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "avatar",
        label: "Profile Picture",
        type: "file",
        validator: validationSchemas.file.imageOptional()
      })
    ],
    onSubmit: async (data) => {
      const response = await api.put("/profile", data);
      return response;
    },
    onCancel: () => modal.close()
  });

  return handler.createForm();
}

/**
 * PATTERN 5: Conditional validation
 */
function example5() {
  // Validate only if checkbox is checked
  const conditionalValidator = (value) => {
    const checkbox = document.querySelector("#subscribe");
    if (!checkbox.checked) return null; // Skip validation if not checked
    return validators.email(value);
  };

  const field = createFormGroup({
    id: "email",
    label: "Email (required if subscribed)",
    type: "email",
    validator: conditionalValidator
  });
  return field;
}

/**
 * PATTERN 6: Date range validation
 */
function example6() {
  const startValidator = (value) => {
    const date = new Date(value);
    const endInput = document.querySelector("#end-date");
    const endDate = endInput ? new Date(endInput.value) : null;
    
    if (!endDate) return null;
    return date <= endDate ? null : "Start date must be before end date";
  };

  const form = new FormHandler({
    fields: [
      createFormGroup({
        id: "start-date",
        label: "Start Date",
        type: "date",
        validator: validators.compose(validators.required, startValidator),
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "end-date",
        label: "End Date",
        type: "date",
        validator: validators.required,
        validationTrigger: "change"
      })
    ],
    onSubmit: async (data) => {
      // Both dates are validated
      await api.post("/event", data);
    }
  });

  return form.createForm();
}


// ─────────────────────────────────────────────────────────────────────────────
// 🔄 MIGRATION FROM OLD SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OLD CODE (no validation):
 * 
 *   const form = createElement("form");
 *   const field = createFormGroup({
 *     id: "email",
 *     label: "Email",
 *     type: "email"
 *   });
 *   form.appendChild(field);
 * 
 *   form.addEventListener("submit", async (e) => {
 *     e.preventDefault();
 *     const email = form.querySelector("#email").value;
 *     
 *     if (!email.includes("@")) {
 *       alert("Invalid email");
 *       return;
 *     }
 *     
 *     await api.post("/submit", { email });
 *   });
 */

/**
 * NEW CODE (with validation):
 * 
 *   const handler = new FormHandler({
 *     fields: [
 *       createFormGroup({
 *         id: "email",
 *         label: "Email",
 *         type: "email",
 *         validator: validators.email,
 *         validationTrigger: "blur"
 *       })
 *     ],
 *     onSubmit: async (data) => {
 *       // Email is already validated
 *       await api.post("/submit", data);
 *     }
 *   });
 *   
 *   const form = handler.createForm();
 */


// ─────────────────────────────────────────────────────────────────────────────
// 📞 CSS INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add to your HTML <head>:
 * 
 *   <link rel="stylesheet" href="/css/forms.css">
 * 
 * Key CSS classes:
 *   .form-container        ← Form wrapper
 *   .form-group            ← Individual field
 *   .form-error            ← Error message
 *   .form-input-error      ← Input in error state
 *   .form-required         ← Required indicator
 *   .form-buttons          ← Button container
 */


// ─────────────────────────────────────────────────────────────────────────────
// 🏆 BENEFITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ DRY - Write validation rules once, use everywhere
 * ✅ Type Safety - Consistent error messages and handling
 * ✅ UX - Real-time validation feedback
 * ✅ Performance - Debounced validation
 * ✅ Maintainability - Centralized validation logic
 * ✅ Flexibility - Compose validators for complex rules
 * ✅ Backward Compatible - Works with existing code
 * ✅ Easy Migration - Gradual adoption possible
 */


// ─────────────────────────────────────────────────────────────────────────────
// 📖 DOCUMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the complete guide:
 *   → front/js/FORM_VALIDATION_GUIDE.md
 * 
 * Migration instructions:
 *   → front/js/MIGRATION_CHECKLIST.js
 * 
 * Examples and patterns:
 *   → This file (index)
 */


// ─────────────────────────────────────────────────────────────────────────────
// 🐛 TROUBLESHOOTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Q: Validation not showing?
 * A: Check that validator prop is set and validationTrigger is configured
 * 
 * Q: Form submitting with invalid data?
 * A: Ensure FormHandler is managing the form, not manual submit handlers
 * 
 * Q: Want optional validation?
 * A: Validators return null for empty values; don't set validator for optional
 * 
 * Q: Custom validation needed?
 * A: Use validators.custom((value) => !condition ? "error msg" : null)
 * 
 * Q: Async validation (check email exists)?
 * A: Return a Promise from validator: async (value) => { ... }
 */


// ─────────────────────────────────────────────────────────────────────────────
// 🚀 NEXT STEPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Review FORM_VALIDATION_GUIDE.md for complete documentation
 * 2. Pick a form to refactor using MIGRATION_CHECKLIST.js
 * 3. Import validators and validationSchemas
 * 4. Add validator props to form fields
 * 5. Use FormHandler for new forms
 * 6. Test and verify validation works
 * 7. Update CSS to include forms.css if needed
 */

export {
  // This is an informational file - import validators from their modules
};
