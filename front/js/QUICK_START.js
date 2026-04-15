/**
 * ⚡ FORM VALIDATION SYSTEM - 5 MINUTE QUICK START
 * 
 * Copy-paste ready examples to get started immediately
 */

// ─────────────────────────────────────────────────────────────────────────────
// SETUP (1 minute)
// ─────────────────────────────────────────────────────────────────────────────

// 1. Import what you need (choose one or all)
import { validators } from './validation/validators.js';
import { validationSchemas } from './validation/validationSchemas.js';
import { FormHandler } from './validation/FormHandler.js';
import { createFormGroup } from './components/createFormGroup.js';

// 2. Add CSS to your HTML
// <link rel="stylesheet" href="/css/forms.css">

// Done! ✨


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 1: Simple Email Validation (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

// Before:
/*
const emailField = createFormGroup({
  id: "email",
  label: "Email",
  type: "email"
});
// No validation - user can submit invalid email
*/

// After: Just add 2 lines ✨
const emailField = createFormGroup({
  id: "email",
  label: "Email",
  type: "email",
  validator: validators.email,        // ← ADD THIS
  validationTrigger: "blur"           // ← ADD THIS
});


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 2: Number Field with Range (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

const ratingField = createFormGroup({
  id: "rating",
  label: "Rate (1-5)",
  type: "number",
  validator: validationSchemas.number.rating(), // Pre-built schema!
  additionalProps: { min: 1, max: 5 }
});


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 3: File Upload with Size Limit (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

const imageField = createFormGroup({
  id: "profile-pic",
  label: "Upload Photo",
  type: "file",
  // Validate: must be image AND less than 5MB
  validator: validators.compose(
    validationSchemas.file.image(),
    validators.fileSize(5 * 1024 * 1024)
  ),
  validationTrigger: "change"
});


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 4: Complete Form (Copy & Customize)
// ─────────────────────────────────────────────────────────────────────────────

// Define your validation rules once
const myFormValidation = {
  username: validators.compose(
    validators.required,
    validators.minLength(3),
    validators.maxLength(20)
  ),
  email: validationSchemas.text.email(),
  age: validators.compose(
    validators.number,
    validators.min(18)
  )
};

// Create form with FormHandler (handles validation automatically)
const handler = new FormHandler({
  id: "signup-form",
  submitButtonText: "Sign Up",
  showCancelButton: true,
  fields: [
    createFormGroup({
      id: "username",
      label: "Username",
      type: "text",
      placeholder: "3-20 characters",
      validator: myFormValidation.username,
      validationTrigger: "blur"
    }),
    createFormGroup({
      id: "email",
      label: "Email",
      type: "email",
      placeholder: "user@example.com",
      validator: myFormValidation.email,
      validationTrigger: "blur"
    }),
    createFormGroup({
      id: "age",
      label: "Age",
      type: "number",
      placeholder: "Must be 18+",
      validator: myFormValidation.age,
      additionalProps: { min: 18 }
    })
  ],
  onSubmit: async (data) => {
    // data is automatically validated - no need to check!
    console.log("Form is valid, data:", data);
    await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  onCancel: () => {
    console.log("Form cancelled");
  }
});

// Add to page
document.getElementById("my-form-container").appendChild(handler.createForm());


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 5: Custom Validation Message (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

const phoneField = createFormGroup({
  id: "phone",
  label: "Phone",
  type: "tel",
  // Custom error message
  validator: validators.pattern(
    /^[\d\s\-\+\(\)]{10,}$/,
    "Phone must be at least 10 digits"
  ),
  validationTrigger: "blur"
});


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 6: Optional Validation (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

// Website field - optional, but if provided must be valid URL
const websiteField = createFormGroup({
  id: "website",
  label: "Website (optional)",
  type: "url",
  // validators return null for empty values = skip validation
  validator: validators.url
});

// Or make required but optional:
const bioField = createFormGroup({
  id: "bio",
  label: "Bio (optional)",
  type: "textarea",
  // Will only validate if not empty
  validator: validators.maxLength(500)
});


// ─────────────────────────────────────────────────────────────────────────────
// QUICK RECIPE 7: Date Range Validation (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

const eventDateField = createFormGroup({
  id: "event-date",
  label: "Event Date",
  type: "date",
  // Must be in the future
  validator: validators.compose(
    validators.required,
    validators.date,
    (value) => {
      const eventDate = new Date(value);
      const today = new Date();
      return eventDate >= today ? null : "Event must be in the future";
    }
  ),
  validationTrigger: "blur"
});


// ─────────────────────────────────────────────────────────────────────────────
// COMMON VALIDATORS REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Use these directly for simple validation:
 * 
 * validators.required                      ← Not empty
 * validators.email                         ← Valid email
 * validators.number                        ← Is a number
 * validators.min(10)                       ← >= 10
 * validators.max(100)                      ← <= 100
 * validators.minLength(3)                  ← At least 3 chars
 * validators.maxLength(50)                 ← Max 50 chars
 * validators.pattern(/regex/)              ← Regex match
 * validators.url                           ← Valid URL
 * validators.phone                         ← Valid phone
 * 
 * Use validationSchemas for pre-built patterns:
 * 
 * validationSchemas.text.email()           ← Email (required)
 * validationSchemas.text.password()        ← Strong password
 * validationSchemas.number.price()         ← Price >= 0
 * validationSchemas.number.percentage()    ← 0-100
 * validationSchemas.file.image()           ← Required image
 * validationSchemas.date.future()          ← Future date
 */


// ─────────────────────────────────────────────────────────────────────────────
// COMPOSE VALIDATORS FOR COMPLEX RULES (Copy & Use)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validators.compose = ALL must pass
 * validators.or = AT LEAST ONE must pass
 */

// Password must be: required AND min 8 chars AND have uppercase AND have number
const strongPassword = validators.compose(
  validators.required,
  validators.minLength(8),
  validators.pattern(/[A-Z]/, "Need at least one uppercase letter"),
  validators.pattern(/[0-9]/, "Need at least one number"),
  validators.pattern(/[^A-Za-z0-9]/, "Need at least one special character")
);

const passwordField = createFormGroup({
  id: "password",
  label: "Password",
  type: "password",
  validator: strongPassword,
  validationTrigger: "change"
});


// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD EXAMPLE: E-commerce Product Form
// ─────────────────────────────────────────────────────────────────────────────

const productHandler = new FormHandler({
  id: "product-form",
  submitButtonText: "Add Product",
  showCancelButton: true,
  fields: [
    // Product name - required, 3-100 chars
    createFormGroup({
      id: "product-name",
      label: "Product Name",
      type: "text",
      placeholder: "Enter product name",
      validator: validators.compose(
        validators.required,
        validators.minLength(3),
        validators.maxLength(100)
      ),
      validationTrigger: "blur"
    }),
    
    // Price - required, >= 0
    createFormGroup({
      id: "price",
      label: "Price",
      type: "number",
      placeholder: "0.00",
      validator: validationSchemas.number.price(),
      additionalProps: { min: 0, step: "0.01" }
    }),
    
    // Stock - required, integer >= 0
    createFormGroup({
      id: "stock",
      label: "Stock Quantity",
      type: "number",
      placeholder: "0",
      validator: validators.compose(
        validators.required,
        validators.integer,
        validators.min(0)
      ),
      additionalProps: { min: 0 }
    }),
    
    // Description - optional, max 500 chars
    createFormGroup({
      id: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Optional description...",
      validator: validators.maxLength(500),
      validationTrigger: "change"
    }),
    
    // Product image - required image, max 5MB
    createFormGroup({
      id: "image",
      label: "Product Image",
      type: "file",
      validator: validators.compose(
        validationSchemas.file.image(),
        validators.fileSize(5 * 1024 * 1024)
      ),
      validationTrigger: "change"
    })
  ],
  onSubmit: async (data) => {
    console.log("Adding product:", data);
    const response = await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: data["product-name"],
        price: data.price,
        stock: data.stock,
        description: data.description,
        image: data.image
      })
    });
    console.log("Product added!");
  }
});

// Use it
document.getElementById("form-container").appendChild(productHandler.createForm());


// ─────────────────────────────────────────────────────────────────────────────
// THAT'S IT! 🎉
// ─────────────────────────────────────────────────────────────────────────────

/**
 * You now have:
 * ✅ Form fields with automatic validation
 * ✅ Real-time error messages
 * ✅ Standardized validation across your app
 * ✅ Less code to maintain
 * ✅ Better user experience
 * 
 * Next steps:
 * 1. Try one of the recipes above
 * 2. Read FORM_VALIDATION_GUIDE.md for complete docs
 * 3. Look at REFACTORED_SERVICE_EXAMPLES.js for more patterns
 * 4. Use MIGRATION_CHECKLIST.js to refactor existing forms
 */
