# Internationalization (i18n) Guide

This guide explains how to use the i18n system in the Scav frontend application.

## Overview

The i18n system provides translations in 6 languages:
- **English** (en) - Default/Fallback language
- **Spanish** (es)
- **French** (fr)
- **Hindi** (hi)
- **Arabic** (ar)
- **Japanese** (jp)

All translation files are located in `/front/static/i18n/` and are organized by feature/section.

## Basic Usage

### Importing the i18n function

```javascript
import { t } from "../../i18n/i18n.js";
```

### Simple Translation

For simple text translations, use the `t()` function:

```javascript
const label = t("nav.farms");  // Returns "Farms" in English
```

### Variable Interpolation

Use `{variableName}` in your translation strings:

```javascript
// In translation file (en.json):
{
  "upload": {
    "uploaded": "✔ {filename} uploaded"
  }
}

// In code:
const message = t("upload.uploaded", { filename: "photo.jpg" });
// Returns: "✔ photo.jpg uploaded"
```

### Pluralization

Use `.one` and `.other` suffixes for plural forms:

```javascript
// In translation file (en.json):
{
  "jobCount": {
    "one": "1 job available",
    "other": "{count} jobs available"
  }
}

// In code:
const text = t("jobCount", { count: 5 });
// Returns: "5 jobs available"

const text = t("jobCount", { count: 1 });
// Returns: "1 job available"
```

## Translation File Structure

Translation files are organized by feature/section:

```json
{
  "common": { ... },        // Shared UI elements (save, delete, etc.)
  "nav": { ... },           // Navigation labels
  "baito": { ... },         // Job posting feature
  "recipes": { ... },       // Recipes feature
  "auth": { ... },          // Authentication
  "feed": { ... },          // Social feed
  "upload": { ... },        // File upload messages
  "payment": { ... },       // Payment related
  "footer": { ... }         // Footer links
}
```

## Common Translation Keys

### Common Actions (in `common` section)
- `common.save` - Save button
- `common.delete` - Delete button
- `common.edit` - Edit button
- `common.update` - Update button
- `common.cancel` - Cancel button
- `common.logout` - Logout button
- `common.loading` - Loading message
- `common.error` - Error
- `common.success` - Success message
- `common.more` - "More" / "Show more"
- `common.less` - "Less" / "Show less"

### Navigation (in `nav` section)
- `nav.farms`, `nav.products`, `nav.recipes`, etc.

### Baito/Jobs (in `baito` section)
- `baito.jobTitle`, `baito.postAJob`, `baito.apply`, etc.

## Adding New Translations

### When Adding a New Feature:

1. **Identify all user-facing text** that needs translation

2. **Choose a section** in the translation files or create a new one
   - Use logical grouping (e.g., "recipes" for recipe-related strings)

3. **Add keys to all translation files** (en.json, es.json, fr.json, hi.json, ar.json, jp.json)
   - Keep the same structure across all files
   - Use consistent, descriptive key names

4. **Example: Adding recipe difficulty levels**

```javascript
// Add to each translation file:
{
  "recipes": {
    "difficulty": "Difficulty",
    "easy": "Easy",
    "medium": "Medium",
    "hard": "Hard"
  }
}

// Use in code:
const difficultyLabel = t("recipes.difficulty");
const easyText = t("recipes.easy");
```

## Best Practices

### 1. Use Semantic Key Names
```javascript
// ✅ Good
t("baito.postAJob")
t("payment.processingPayment")

// ❌ Avoid
t("button1")
t("msg2")
```

### 2. Place Hardcoded Strings in Translation Files
```javascript
// ❌ Don't do this:
element.textContent = "Save";
element.textContent = "Delete";

// ✅ Do this:
element.textContent = t("common.save");
element.textContent = t("common.delete");
```

### 3. Use Proper Pluralization
```javascript
// ❌ Incorrect:
const text = count > 1 ? `${count} jobs` : "1 job";

// ✅ Correct:
const text = t("jobCount", { count });
```

### 4. Keep Translations Consistent
- Use the same terminology across all languages
- Check existing translations before adding new ones
- Maintain consistent capitalization and punctuation

### 5. Test Multiple Languages
- Always test with at least one other language
- Check that variable interpolation works correctly
- Verify pluralization for edge cases (0, 1, many)

## Language Detection

The system automatically detects the user's preferred language:

1. **Saved preference** - Check localStorage for previously chosen language
2. **Browser language** - Check browser's navigator.languages
3. **Fallback** - Default to English if no language is supported

Users can change their language using the language selector in the footer.

## Adding a New Language

To add a new language (e.g., German "de"):

1. Create `/front/static/i18n/de.json` with all translation keys
2. Update `SUPPORTED_LANGS` in `/front/js/i18n/i18n.js`:
   ```javascript
   const SUPPORTED_LANGS = ["en", "es", "fr", "hi", "ar", "ja", "jp", "de"];
   ```
3. Add the language option to the footer language selector in `/front/js/components/footer.js`:
   ```javascript
   createElement("option", { value: "de" }, ["Deutsch"])
   ```

## Translation File Organization

Current structure:

```
front/static/i18n/
├── en.json     (English - Master/Reference)
├── es.json     (Spanish)
├── fr.json     (French)
├── hi.json     (Hindi)
├── ar.json     (Arabic)
└── jp.json     (Japanese)
```

## Useful Functions

### In `/front/js/i18n/i18n.js`

```javascript
// Set language and load translations
setLanguage(lang)

// Detect user's preferred language
detectLanguage()

// Get current language code
getCurrentLanguage()

// Translate a key with optional variables
t(key, vars = {}, fallback = "")

// Initialize i18n on page load
initI18n()
```

## Debugging

### Check if a translation is missing:
1. Open browser console
2. Look for warnings like: "Missing translation: baito.nonExistentKey"
3. Add the missing key to all translation files

### Test a language:
1. Open footer language selector
2. Change language
3. Page content should update
4. Check localStorage for "lang" key

### Verify translation structure:
1. Ensure all files have matching key structure
2. Use JSON linter to check syntax
3. Test variable interpolation in console:
```javascript
// In browser console:
t("baito.acceptedStub", { name: "John" })
```

## Performance Notes

- Translations are loaded asynchronously from JSON files
- Loaded translations are cached in memory
- Language preference is saved to localStorage
- No external dependencies required

## Examples

### Example 1: Navigation Label
```javascript
// In navigation.js
const navLabel = t("nav.recipes");
element.textContent = navLabel;
```

### Example 2: Status with Pluralization
```javascript
// In baito listing
const jobCount = jobs.length;
const statusText = t("jobCount", { count: jobCount });
```

### Example 3: User Feedback
```javascript
// In payment processing
if (success) {
  showMessage(t("payment.paymentSuccessful"));
} else {
  showMessage(t("payment.paymentFailed"));
}
```

### Example 4: Dynamic Content
```javascript
// In file upload
const filename = "document.pdf";
const message = t("upload.uploaded", { filename });
// Returns: "✔ document.pdf uploaded" (or equivalent in chosen language)
```

## Support

For questions or issues with translations:
1. Check existing translation files for reference
2. Verify key structure matches across all files
3. Test in console with `t()` function
4. Add missing translations to all language files
