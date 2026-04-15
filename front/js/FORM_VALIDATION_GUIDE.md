# Form Validation System - Documentation

## Overview

A comprehensive, DRY form validation and handling system for the frontend. Provides:

- **Reusable Validators** - Pre-built validators for common input types
- **Validation Schemas** - Define validation rules once, use everywhere
- **Enhanced Form Groups** - Form inputs with built-in validation and error display
- **Form Handler** - Centralized form management with automatic validation
- **Real-time Validation** - Immediate user feedback as they type

## Quick Start

### 1. Basic Form Group with Validation

```javascript
import { createFormGroup } from './components/createFormGroupEnhanced.js';
import { validators } from './validation/validators.js';

const nameField = createFormGroup({
  id: "name",
  name: "name",
  label: "Full Name",
  placeholder: "John Doe",
  required: true,
  validator: validators.compose(
    validators.required,
    validators.minLength(3)
  ),
  validationTrigger: "blur" // or "change" or "both"
});

form.appendChild(nameField);
```

### 2. Using Validation Schemas

```javascript
import { validationSchemas, createValidationSchema } from './validation/validationSchemas.js';

const schema = createValidationSchema({
  email: validationSchemas.text.email(),
  price: validationSchemas.number.price(),
  dateOfBirth: validationSchemas.date.required(),
  bio: validators.maxLength(500)
});

const errors = validateForm(formData, schema);
```

### 3. Using Form Handler for Complete Forms

```javascript
import { FormHandler } from './validation/FormHandler.js';
import { validators } from './validation/validators.js';
import { createFormGroup } from './components/createFormGroupEnhanced.js';

const handler = new FormHandler({
  id: "user-form",
  submitButtonText: "Create User",
  showCancelButton: true,
  fields: [
    createFormGroup({
      id: "email",
      label: "Email",
      type: "email",
      validator: validationSchemas.text.email(),
      validationTrigger: "blur"
    }),
    createFormGroup({
      id: "password",
      label: "Password",
      type: "password",
      validator: validationSchemas.text.password(),
      validationTrigger: "blur"
    })
  ],
  onSubmit: async (data) => {
    await api.post("/users", data);
  },
  onCancel: () => modal.close()
});

const form = handler.createForm();
```

## Validators

### Text Validators

```javascript
import { validators } from './validation/validators.js';

validators.required(value)                    // Not empty
validators.email(value)                       // Valid email
validators.url(value)                         // Valid URL
validators.phone(value)                       // Valid phone
validators.minLength(10)(value)               // Min 10 chars
validators.maxLength(50)(value)               // Max 50 chars
validators.pattern(/^[a-z]+$/)(value)         // Regex pattern with message
```

### Number Validators

```javascript
validators.number(value)                      // Is valid number
validators.integer(value)                     // Is whole number
validators.min(0)(value)                      // >= 0
validators.max(100)(value)                    // <= 100
validators.range(0, 100)(value)               // Between 0-100
```

### File Validators

```javascript
validators.fileType(['image/*', '.pdf'])(input)
validators.fileSize(5 * 1024 * 1024)(input)   // Max 5MB
```

### Date Validators

```javascript
validators.date(value)                        // Valid date
validators.minDate('2024-01-01')(value)       // On or after
validators.maxDate('2024-12-31')(value)       // On or before
```

### Composite Validators

```javascript
// All must pass
validators.compose(
  validators.required,
  validators.minLength(8),
  validators.pattern(/[A-Z]/, "Must have uppercase")
)(value)

// At least one must pass
validators.or(
  validators.email,
  validators.phone
)(value)
```

## Validation Schemas

Pre-built schemas for common use cases:

```javascript
import { validationSchemas } from './validation/validationSchemas.js';

// Text schemas
validationSchemas.text.required()              // Non-empty text
validationSchemas.text.email()                 // Email format
validationSchemas.text.url()                   // URL format
validationSchemas.text.password()              // Strong password
validationSchemas.text.slug()                  // URL-friendly slug

// Number schemas
validationSchemas.number.required()            // Required number
validationSchemas.number.price()               // Price (>= 0)
validationSchemas.number.percentage()          // Percentage (0-100)
validationSchemas.number.rating()              // Rating (1-5)

// Date schemas
validationSchemas.date.required()              // Required date
validationSchemas.date.future()                // Future date
validationSchemas.date.past()                  // Past date

// File schemas
validationSchemas.file.image()                 // Required image
validationSchemas.file.imageOptional()         // Optional image
validationSchemas.file.audio()                 // Required audio
validationSchemas.file.video()                 // Required video
validationSchemas.file.document()              // PDF/DOC files
validationSchemas.file.maxSize(5MB)            // File size limit

// Select schemas
validationSchemas.select.required()            // Required select
```

## Form Groups with Validation

### Configuration Options

```javascript
createFormGroup({
  // Standard options
  type: "text",                    // input type
  id: "field-id",                 // HTML id
  name: "fieldName",              // Form field name
  label: "Field Label",           // Display label
  value: "",                      // Initial value
  placeholder: "...",             // Placeholder text
  required: false,                // HTML required attr
  accept: "image/*",              // File type filter
  options: [],                    // For select/multiselect
  multiple: false,                // Multiple files/options
  
  // Validation options
  validator: validators.required, // Validation function(s)
  validationTrigger: "blur",      // "blur", "change", or "both"
  onValidationChange: (isValid) => {}, // Callback
  
  // Additional
  additionalProps: {},            // Extra HTML attributes
  additionalNodes: []             // Extra elements (previews, etc)
})
```

### Input Types Supported

- `text` - Text input
- `email` - Email input
- `password` - Password input
- `number` - Number input with min/max
- `date` - Date picker
- `datetime-local` - DateTime picker
- `file` - File upload (single or multiple)
- `textarea` - Multi-line text
- `select` - Dropdown
- `multiselect` - Multi-select dropdown
- `checkbox` - Checkbox
- `radio` - Radio button

## Form Handler - Complete API

```javascript
const handler = new FormHandler(config);

// Methods
handler.createForm()              // Create and return form element
handler.getData()                 // Get all form data as object
handler.setData(data)             // Pre-populate form fields
handler.validate()                // Validate all fields
handler.reset()                   // Reset form to initial state
handler.clearErrors()             // Clear all error messages
handler.setDisabled(disabled)     // Enable/disable all inputs
```

## Migration Guide

### Old Pattern (No Validation)

```javascript
const form = createElement("form", { id: "menu-form" });
const fields = [
  { label: "Menu Name", type: "text", id: "menu-name", required: true },
  { label: "Price", type: "number", id: "menu-price", required: true }
];
fields.forEach(f => form.appendChild(createFormGroup(f)));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = form.querySelector("#menu-name").value.trim();
  const price = parseFloat(form.querySelector("#menu-price").value);
  
  if (!name || isNaN(price)) {
    Notify("Invalid input", "error");
    return;
  }
  
  // ... submit
});
```

### New Pattern (With Validation)

```javascript
import { FormHandler } from './validation/FormHandler.js';
import { validationSchemas } from './validation/validationSchemas.js';
import { createFormGroup } from './components/createFormGroupEnhanced.js';

const handler = new FormHandler({
  id: "menu-form",
  submitButtonText: "Add Menu",
  fields: [
    createFormGroup({
      id: "menu-name",
      label: "Menu Name",
      type: "text",
      validator: validators.compose(validators.required, validators.minLength(3)),
      validationTrigger: "blur"
    }),
    createFormGroup({
      id: "menu-price",
      label: "Price",
      type: "number",
      validator: validationSchemas.number.price(),
      additionalProps: { min: 0, step: "0.01" }
    })
  ],
  onSubmit: async (data) => {
    // data is already validated
    await api.post("/menus", {
      name: data["menu-name"],
      price: data["menu-price"]
    });
  }
});

modal.content = handler.createForm();
```

## Best Practices

1. **Define schemas once, reuse everywhere**
   ```javascript
   // Define in a shared file
   export const userValidationSchema = {
     email: validationSchemas.text.email(),
     password: validationSchemas.text.password()
   };
   
   // Use across the app
   const errors = validateForm(data, userValidationSchema);
   ```

2. **Use real-time validation for better UX**
   ```javascript
   createFormGroup({
     validator: validators.email,
     validationTrigger: "blur" // or "both" for real-time
   })
   ```

3. **Compose validators for complex rules**
   ```javascript
   const strongPassword = validators.compose(
     validators.required,
     validators.minLength(8),
     validators.pattern(/[A-Z]/, "Need uppercase"),
     validators.pattern(/[0-9]/, "Need number"),
     validators.pattern(/[^A-Za-z0-9]/, "Need special char")
   );
   ```

4. **Use FormHandler for complete forms**
   ```javascript
   // Handles all validation, data collection, submission
   const handler = new FormHandler({ /* ... */ });
   ```

5. **Customize error messages**
   ```javascript
   validators.pattern(/^[0-9]{10}$/, "Must be 10 digits")(value)
   ```

## CSS Classes

Add the CSS file to your HTML:
```html
<link rel="stylesheet" href="/css/forms.css">
```

Key classes:
- `.form-container` - Form wrapper
- `.form-group` - Individual field wrapper
- `.form-error` - Error message
- `.form-input-error` - Input with error
- `.form-valid` - Successfully validated field
- `.form-required` - Required indicator
- `.form-buttons` - Button container
- `.is-loading` - Loading state

## Examples

### User Registration Form

```javascript
const registrationForm = new FormHandler({
  id: "register-form",
  submitButtonText: "Register",
  fields: [
    createFormGroup({
      id: "name",
      label: "Full Name",
      validator: validators.compose(validators.required, validators.minLength(3))
    }),
    createFormGroup({
      id: "email",
      label: "Email",
      type: "email",
      validator: validationSchemas.text.email()
    }),
    createFormGroup({
      id: "password",
      label: "Password",
      type: "password",
      validator: validationSchemas.text.password(),
      validationTrigger: "blur"
    })
  ],
  onSubmit: async (data) => {
    const response = await api.post("/auth/register", data);
    Notify("Registration successful!", "success");
  }
});
```

### Image Upload Form

```javascript
const imageForm = new FormHandler({
  fields: [
    createFormGroup({
      id: "image",
      label: "Upload Image",
      type: "file",
      validator: validators.compose(
        validationSchemas.file.image(),
        validators.fileSize(5 * 1024 * 1024) // 5MB
      )
    })
  ],
  onSubmit: async (data) => {
    const formData = new FormData();
    formData.append("file", data.image[0]);
    await api.post("/upload", formData);
  }
});
```

## Troubleshooting

**Validation not triggering?**
- Check that `validator` is defined
- Check `validationTrigger` value
- Call `input.validate()` manually if needed

**Form not submitting?**
- Check validation passes with `handler.validate()`
- Check browser console for errors
- Ensure `onSubmit` is defined

**Want to skip validation for a field?**
- Don't set the `validator` property
- Or use `validators.or(validators.required, () => null)` to make it optional

## Integration with Existing Code

The system is **backward compatible**. Existing code using old `createFormGroup` will still work. Simply:
1. Update file imports to use `createFormGroupEnhanced.js`
2. Add `validator` and `validationTrigger` props as needed
3. Use new FormHandler for new forms or gradual refactoring
