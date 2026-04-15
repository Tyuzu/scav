# Form Validation Analysis: createFormGroup Usage

## Summary
Found **20+ files** using `createFormGroup` across the front/js/services directory with consistent validation patterns and field types.

---

## Files Using createFormGroup (15+ Examples)

| File | Key Field Types | Validation Pattern |
|------|-----------------|-------------------|
| **artist/songModal.js** | file (audio, image), text | Audio metadata loading on file change, required fields |
| **baitos/create/createOrEditBaito.js** | select, text, textarea, email, number | Required field validation, wage > 0, FormData + custom validation |
| **artist/createOrEditMembers.js** | select, text, date, file | Required field checking |
| **artist/createOrEditArtist.js** | select, text, textarea, url | Required fields, genre array parsing |
| **booking/booking.js** | number, date, select | Price/capacity min bounds, date range validation |
| **crops/products/createOrEdit.js** | text, select, number, date, textarea, checkbox, file | Required fields, price/quantity min bounds, date slice parsing |
| **feed/renders/postEditor.js** | textarea, text, select, file | Comma-separated tag parsing, file upload (subtitle .vtt) |
| **recipes/createOrEditRecipe.js** | text, number, select, textarea | Required fields, min servings (1), comma-separated array parsing |
| **crops/crop/createOrEditCrop.js** | select, number, date, checkbox | Required fields, harvest < expiry date validation |
| **reviews/createReview.js** | number, textarea | Rating 1-5 bounds, required comment |
| **event/createOrEditEvent.js** | Multiple (dynamic) | Wrapper/form appendChild pattern |
| **event/eventFAQHelper.js** | text, textarea | Q&A pair structure |
| **jobs/jobs.js** | select (category/role), text | Category-driven subcategory population |
| **place/createPlaceService.js** | select, text, number, date | Category-driven subcategory selection, dynamic tag handling |
| **merch/merchService.js** | Multiple | Dynamic field mapping pattern |
| **menu/menuService.js** | Multiple | Dynamic field mapping pattern |
| **tickets/ticketService.js** | text, number, select | Required validation, seatstart ≤ seatend |
| **posts/createOrEditPost.js** | select, text (helper functions) | Select/Text group helpers for code reuse |
| **place/editPlace.js** | select, text, number | Similar to createPlaceService |
| **crops/farm/createOrEditFarm.js** | Multiple | Field mapping pattern |

---

## Common Field Types Used

### 1. **TEXT** (Most Common)
- Used for: titles, names, descriptions, URLs, locations, phone numbers, SKU codes
- Validation: `required`, `placeholder`, `value` preset
- Example:
```javascript
createFormGroup({ 
  type: "text", 
  id: "artist-name", 
  label: "Artist Name", 
  required: true, 
  placeholder: "Enter artist name" 
})
```

### 2. **TEXTAREA**
- Used for: descriptions, bios, requirements, notes, comments
- Validation: `required`, character count tracking in some cases
- Example:
```javascript
createFormGroup({
  type: "textarea",
  id: "description",
  label: "Description",
  placeholder: "Job description",
  required: true,
  additionalNodes: [descriptionCounter] // Character counter element
})
```

### 3. **NUMBER**
- Used for: prices, quantities, ratings, wages, capacity, hours
- Validation: `min`, `max`, `step` via `additionalProps`
- Example:
```javascript
createFormGroup({
  type: "number",
  id: "price",
  label: "Price (₹)",
  value: itemData?.price ?? "",
  required: true,
  additionalProps: { step: "0.01", min: "0" }
})
```

### 4. **SELECT / MULTISELECT**
- Used for: categories, roles, units, currencies, languages, tiers
- Validation: Required selection, placeholder option handling
- Example:
```javascript
createFormGroup({
  type: "select",
  id: "category",
  label: "Category",
  required: true,
  placeholder: "Select category",
  options: [
    { value: "Food", label: "Food & Beverage" },
    { value: "Health", label: "Health & Wellness" }
  ],
  value: existingValue
})
```

### 5. **DATE**
- Used for: birthdates, harvest dates, available dates, booking dates
- Validation: Date comparison (harvest < expiry), date slice parsing
- Example:
```javascript
createFormGroup({
  type: "date",
  id: "crop-harvest",
  label: "Harvest Date",
  value: crop.harvestDate?.split("T")[0] || ""
})
```

### 6. **FILE**
- Used for: audio files, images, videos, documents
- Validation: `accept` mime type filter, file upload handling
- File Types:
  - `accept="audio/*"` - songModal.js
  - `accept="image/*"` - songModal.js, products
  - `accept=".vtt"` - postEditor.js (subtitles)
  - Multiple: `multiple: true`
- Example:
```javascript
createFormGroup({
  type: "file",
  name: "audio",
  label: "Audio File",
  accept: "audio/*",
  additionalNodes: [audioPreview]
})
```

### 7. **EMAIL**
- Used for: contact information
- Example:
```javascript
createFormGroup({
  type: "email",
  id: "baito-email",
  placeholder: "Enter email address"
})
```

### 8. **URL**
- Used for: social media profiles, website links
- Example:
```javascript
createFormGroup({
  type: "url",
  id: "social-url",
  label: "URL",
  required: true,
  placeholder: "https://..."
})
```

### 9. **CHECKBOX**
- Used for: boolean flags (featured, out of stock)
- Example:
```javascript
createFormGroup({
  type: "checkbox",
  id: "crop-featured",
  label: "Featured",
  value: crop.featured || false
})
```

---

## Validation Patterns

### Pattern 1: Required Field Validation
```javascript
// In form submit handler
const requiredFields = {
  title: fd.get("baito-title")?.trim(),
  workHours: fd.get("baito-workinghours")?.trim(),
  category: fd.get("category-main")
};

if (Object.values(requiredFields).some(v => !v)) {
  Notify("Please fill in all required fields.", { type: "warning" });
  return null;
}
```

### Pattern 2: Number Bounds Validation
```javascript
// Wage must be positive
if (Number(requiredFields.wage) <= 0) {
  Notify("Wage must be greater than 0.");
  return null;
}

// Rating between 1-5
const rating = Number(form.querySelector("#rating").value);
if (rating < 1 || rating > 5) {
  alert("Invalid rating");
  return;
}
```

### Pattern 3: Date Comparison Validation
```javascript
// Expiry must be after harvest
const h = new Date(harvestGroup.querySelector("input").value);
const x = new Date(expiryGroup.querySelector("input").value);
if (h > x) {
  form.parentElement.textContent = "❌ Expiry date must be after harvest date.";
  return;
}
```

### Pattern 4: File Metadata Extraction
```javascript
// Extract audio duration on file upload
audioInput.addEventListener("change", () => {
  const file = audioInput.files[0];
  if (!file) return;

  const audioEl = document.createElement("audio");
  audioEl.preload = "metadata";
  audioEl.src = URL.createObjectURL(file);

  audioEl.addEventListener("loadedmetadata", () => {
    const totalSeconds = Math.floor(audioEl.duration);
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    durationInput.value = `${mins}:${secs}`;
    submitBtn.disabled = false;
  });
});
```

### Pattern 5: Comma-Separated String Parsing
```javascript
// Convert comma-separated string to array
const tags = tagsField
  .querySelector("input")
  .value.split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// Or reverse: array to comma-separated
value: (recipe?.dietary || []).join(", ")
```

### Pattern 6: Dynamic Field Population
```javascript
// Category select changes subcategory options
categorySelect.addEventListener("change", (e) => {
  const subSelect = form.querySelector("#category-sub");
  subSelect.innerHTML = '<option value="">Select role type</option>';
  const options = categoryMap[e.target.value] || [];
  options.forEach(opt => {
    const o = createElement("option", { value: opt }, [opt]);
    subSelect.appendChild(o);
  });
  subSelect.value = existingValue || "";
});
```

### Pattern 7: Custom Validation Before Submit
```javascript
// In form submit listener
form.addEventListener("submit", e => {
  e.preventDefault();
  
  // Custom validation logic
  if (!durationLoaded) {
    Notify("Audio duration not loaded yet", "error");
    return;
  }
  
  // Proceed with submission
  const formData = new FormData(form);
  onSubmit(formData, submitBtn);
});
```

### Pattern 8: Seat Range Validation
```javascript
// seatstart must be <= seatend
if (payload.seatstart > payload.seatend) {
  Notify("Please enter valid seat range.");
  return;
}
```

---

## File Type Validations

| File Type | Accept Attribute | Usage | Validation |
|-----------|------------------|-------|-----------|
| **Audio** | `audio/*` | songModal.js | Metadata extraction (duration) |
| **Image** | `image/*` | songModal.js, products | Preview rendering |
| **Video** | `video/*` | Feed/postEditor | Subtitle file pairing |
| **Subtitle** | `.vtt` | postEditor.js | Language selection dropdown |
| **All Images** | `image/*` | Product creation | Image preview loop |

---

## Error Handling Patterns

### Pattern A: Notify() for User Feedback
```javascript
// Warning (required fields)
Notify("Please fill in all required fields.", { 
  type: "warning", 
  duration: 3000, 
  dismissible: true 
});

// Success (form submitted)
Notify("Artist created successfully!", { 
  type: "success", 
  duration: 3000 
});

// Error (API failure)
Notify(`Failed to create artist: ${err.message}`, { 
  type: "error", 
  duration: 3000 
});
```

### Pattern B: Try-Catch with API Calls
```javascript
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  try {
    const response = await apiFetch("/artists", "POST", formData);
    Notify("Success!", { type: "success" });
    navigate(`/artist/${response.artistid}`);
  } catch (err) {
    Notify(`Error: ${err.message}`, { type: "error" });
  }
});
```

### Pattern C: Alert for Critical Issues
```javascript
if (rating < 1 || rating > 5 || !comment) {
  alert("Invalid rating or empty comment.");
  return;
}
```

### Pattern D: Form Disable on Processing
```javascript
// Disable submit button during file processing
submitBtn.disabled = !durationLoaded;

// Re-enable after metadata loads
audioEl.addEventListener("loadedmetadata", () => {
  submitBtn.disabled = false;
});
```

---

## Repeated Validation Logic Patterns

### 1. **Character Counter Pattern**
Used in: baitos/create/createOrEditBaito.js
```javascript
const descriptionCounter = createElement("small", { class: "char-count" });
const fields = [{
  label: "Description",
  type: "textarea",
  id: "baito-description",
  additionalNodes: [descriptionCounter]
}];
```

### 2. **Option Preset Selection Pattern**
Used in: crops/crop, products, recipes, artists
```javascript
// For edit mode - populate with existing values
value: field.id === "artist-genres" 
  ? existingArtist.genres.join(", ")
  : existingArtist?.[field.id.replace("artist-", "")] ?? ""
```

### 3. **FormData Collection Pattern**
Used in: multiple files
```javascript
const form = createElement("form", { enctype: "multipart/form-data" });
// ... append fields ...
const formData = new FormData(form);
const value = formData.get("fieldname");
```

### 4. **Min/Max for Number Inputs**
Used in: bookings, products, crops, recipes, tickets, reviews
```javascript
// Min bounds only
additionalProps: { min: "0" }

// Min and Max
additionalProps: { min: 1, max: 5 }

// With step
additionalProps: { step: "0.01", min: "0" }
```

### 5. **Date String Slicing**
Used across date fields for API serialization
```javascript
value: crop.harvestDate?.split("T")[0] || ""
// ISO datetime to YYYY-MM-DD format
```

---

## Key Insights

1. **No Built-in Validation**: `createFormGroup` provides HTML structure only; validation happens in form submit handlers
2. **Standard HTML Attributes**: Uses standard HTML `required`, `min`, `max`, `step`, `accept`
3. **Async Validation**: File metadata extraction is async (audio duration loading)
4. **User Feedback**: Consistent use of `Notify()` component for all validation errors
5. **Array Handling**: Comma-separated strings for tags, dietary info, genres
6. **Dynamic Fields**: Category selects often trigger subcategory population
7. **API Integration**: All forms eventually call `apiFetch()` with FormData or JSON payload
8. **Image Previews**: File inputs often include preview rendering via URL.createObjectURL()
9. **Accessibility**: All fields have `id`, `label`, and `name` attributes
10. **Optional Fields**: Many forms have optional fields alongside required ones

---

## Recommended Validation Enhancements

Based on current patterns:
1. **Centralized validation** - Extract validation logic to separate utility functions
2. **Pattern-based validators** - Email, URL, phone number regex validators
3. **Async file validation** - File size checks before upload
4. **Cross-field validation** - Date range, numeric ratio validation helpers
5. **Reusable error messages** - i18n-ready validation message constants

