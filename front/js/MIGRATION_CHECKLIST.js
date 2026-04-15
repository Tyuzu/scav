#!/usr/bin/env node

/**
 * MIGRATION CHECKLIST - Converting Services to New Form System
 * 
 * Use this checklist when refactoring form-heavy service files to use
 * the centralized validation system
 */

// =====================================================
// STEP 1: Update Imports
// =====================================================

// OLD
// import { createFormGroup } from "../../components/createFormGroup.js";

// NEW - Choose one or both:
import { createFormGroup } from "../../components/createFormGroupEnhanced.js";
import { FormHandler } from "../../validation/FormHandler.js";
import { validators } from "../../validation/validators.js";
import { validationSchemas } from "../../validation/validationSchemas.js";


// =====================================================
// STEP 2: Create Validation Schemas
// =====================================================

// Define schemas once at the top of the file
const MENU_VALIDATION_SCHEMA = {
  ["menu-name"]: validators.compose(
    validators.required,
    validators.minLength(3),
    validators.maxLength(100)
  ),
  ["menu-price"]: validationSchemas.number.price(),
  ["menu-stock"]: validators.compose(
    validators.required,
    validators.number,
    validators.min(0)
  )
};

const SONG_VALIDATION_SCHEMA = {
  title: validators.compose(validators.required, validators.minLength(3)),
  genre: validators.required,
  duration: validators.pattern(/^\d+:\d{2}$/, "Duration format must be MM:SS"),
  description: validators.maxLength(500)
};


// =====================================================
// STEP 3: Extract Form Creation into Separate Function
// =====================================================

// OLD - Inline form creation
async function editMenuForm(menuId, placeId) {
  const menu = await apiFetch(`/places/menu/${placeId}/${menuId}`, 'GET');
  const form = createElement('form', { id: 'edit-menu-form' });
  const fields = [
    { label: "Menu Name", type: "text", id: "menu-name", value: menu.name, required: true },
    { label: "Price", type: "number", id: "menu-price", value: menu.price, required: true }
  ];
  fields.forEach(f => form.appendChild(createFormGroup(f)));
  // ...rest of form setup
}

// NEW - Extracted with validation
function createMenuForm(menu = {}, isEdit = false) {
  return new FormHandler({
    id: isEdit ? "edit-menu-form" : "add-menu-form",
    submitButtonText: isEdit ? "Update Menu" : "Add Menu",
    showCancelButton: true,
    fields: [
      createFormGroup({
        id: "menu-name",
        name: "name",
        label: "Menu Name",
        type: "text",
        value: menu.name || "",
        placeholder: "Enter menu name",
        validator: MENU_VALIDATION_SCHEMA["menu-name"],
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "menu-price",
        name: "price",
        label: "Price",
        type: "number",
        value: menu.price || "",
        placeholder: "0.00",
        validator: MENU_VALIDATION_SCHEMA["menu-price"],
        additionalProps: { min: 0, step: "0.01" }
      }),
      createFormGroup({
        id: "menu-stock",
        name: "stock",
        label: "Stock Available",
        type: "number",
        value: menu.stock || "",
        placeholder: "0",
        validator: MENU_VALIDATION_SCHEMA["menu-stock"],
        additionalProps: { min: 0 }
      })
    ]
  });
}


// =====================================================
// STEP 4: Simplify Form Submission
// =====================================================

// OLD - Manual validation in submit handler
form.addEventListener("submit", async e => {
  e.preventDefault();
  const name = form.querySelector("#menu-name").value.trim();
  const price = parseFloat(form.querySelector("#menu-price").value);
  const stock = parseInt(form.querySelector("#menu-stock").value, 10);

  if (!name || isNaN(price) || isNaN(stock)) {
    Notify("Please fill in all fields correctly.", { type: "error" });
    return;
  }

  try {
    const res = await apiFetch(`/places/menu/${placeId}/${menuId}`, "PUT", 
      JSON.stringify({ name, price, stock }),
      { headers: { "Content-Type": "application/json" } }
    );
    // handle response
  } catch (error) {
    Notify(`Error: ${error.message}`, { type: "error" });
  }
});

// NEW - Validation handled automatically
async function editMenuForm(menuId, placeId) {
  try {
    const menu = await apiFetch(`/places/menu/${placeId}/${menuId}`, 'GET');
    
    const handler = createMenuForm(menu, true);
    handler.onSubmit = async (data) => {
      // data is already validated
      const res = await apiFetch(
        `/places/menu/${placeId}/${menuId}`,
        "PUT",
        data
      );
      if (res.success) {
        Notify("Menu updated successfully!", { type: "success" });
        // Update UI
      }
    };
    handler.onCancel = () => modal.close();

    const modal = Modal({ 
      title: "Edit Menu", 
      content: handler.createForm() 
    });
  } catch (error) {
    Notify(`Error loading menu: ${error.message}`, { type: "error" });
  }
}


// =====================================================
// STEP 5: Refactor File Uploads
// =====================================================

// OLD - Manual file validation
const imageFile = form.querySelector("#menu-image").files[0];
if (imageFile && !imageFile.type.startsWith("image/")) {
  Notify("Please upload a valid image file.", { type: "error" });
  return;
}

// NEW - Automatic validation
const imageGroup = createFormGroup({
  id: "menu-image",
  type: "file",
  label: "Menu Image",
  validator: validationSchemas.file.imageOptional(),
  validationTrigger: "change"
});


// =====================================================
// STEP 6: Add Real-time Validation Feedback
// =====================================================

// For better UX, use "blur" or "both" for real-time feedback
createFormGroup({
  id: "email",
  type: "email",
  validator: validationSchemas.text.email(),
  validationTrigger: "blur", // User sees error when they leave field
})

// For typing feedback, use "both"
createFormGroup({
  id: "password",
  type: "password",
  validator: validationSchemas.text.password(),
  validationTrigger: "both" // Real-time feedback while typing
})


// =====================================================
// STEP 7: Common Refactoring Patterns
// =====================================================

// Pattern 1: Simple Field Validation Extraction
// Before: Validation scattered in submit handlers
// After: Centralized in validators or schema

// Pattern 2: File Upload Validation
// Before:
//   if (!file.type.startsWith("audio/")) { error }
//   if (file.size > MAX) { error }
// After:
//   validator: validators.compose(
//     validators.fileType(["audio/*"]),
//     validators.fileSize(50 * 1024 * 1024)
//   )

// Pattern 3: Date Range Validation
// Before:
//   if (startDate > endDate) { error }
// After:
//   validator: (value) => {
//     const start = new Date(value);
//     const end = new Date(form.querySelector("#end-date").value);
//     return start <= end ? null : "Start date must be before end date";
//   }

// Pattern 4: Async Validation (e.g., email uniqueness)
// Before:
//   const exists = await checkEmail(email);
//   if (exists) { error }
// After:
//   validator: async (value) => {
//     const exists = await checkEmail(value);
//     return exists ? "Email already registered" : null;
//   }


// =====================================================
// STEP 8: Testing Checklist
// =====================================================

/*
After refactoring, verify:

☐ Form displays without JavaScript errors
☐ Required fields show validation error when empty
☐ Number fields reject non-numeric input
☐ Email field validates email format
☐ File uploads validate file type
☐ File uploads validate file size
☐ Dates validate correctly
☐ Phone numbers validate correctly
☐ Form submits with valid data
☐ Form prevents submission with invalid data
☐ Error messages display correctly
☐ Error messages clear when field is corrected
☐ Cancel button works
☐ Form resets properly
☐ Loading state works (disable submit)
☐ Success/error notifications display

Testing code example:
*/

async function testMenuForm() {
  const formContainer = document.getElementById("test-container");
  const handler = createMenuForm();
  handler.onSubmit = async (data) => {
    console.log("Form data:", data);
    return Promise.resolve();
  };
  formContainer.appendChild(handler.createForm());

  // Test invalid submission
  const submitBtn = formContainer.querySelector("button[type='submit']");
  submitBtn.click(); // Should show validation errors

  // Test setting data
  handler.setData({
    name: "Test Menu",
    price: 9.99,
    stock: 10
  });

  // Test validation
  const isValid = handler.validate();
  console.log("Form valid:", isValid);

  // Test data retrieval
  const data = handler.getData();
  console.log("Retrieved data:", data);
}


// =====================================================
// STEP 9: Performance Considerations
// =====================================================

/*
- Validation runs on blur/change, avoid expensive operations
- Cache API calls for dropdowns/selects
- Use debouncing for async validators
- Lazy load file validators

Example debounced async validator:
*/

function createAsyncValidator(asyncFn, debounceMs = 300) {
  let timeout;
  return (value) => {
    return new Promise((resolve) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const error = await asyncFn(value);
          resolve(error);
        } catch (err) {
          resolve("Validation failed");
        }
      }, debounceMs);
    });
  };
}


// =====================================================
// STEP 10: Error Handling
// =====================================================

/*
All validators should return:
- null if valid
- string (error message) if invalid
- Promise<null|string> for async validators

Error messages should be:
- Clear and specific
- User-friendly
- Actionable ("Must be at least 8 characters" not "Invalid")
- Consistent with other fields
*/

// Good error messages
"Email is already registered"
"Password must contain at least one uppercase letter and one number"
"File size must not exceed 5MB"
"Start date must be before end date"

// Avoid confusing messages
"Invalid input"
"Error"
"Failed"


export {
  MENU_VALIDATION_SCHEMA,
  SONG_VALIDATION_SCHEMA,
  createMenuForm,
  createAsyncValidator
};
