# i18n Best Practices for Frontend Development

This document provides templates and best practices for implementing i18n-friendly features in the Scav frontend.

## Before You Start

✅ **Always identify hardcoded strings early**
✅ **Plan your translation keys before implementation**
✅ **Use consistent naming conventions**
✅ **Test with multiple languages**

---

## Template: Creating a New Feature with i18n

### Step 1: Plan Translation Keys

Before writing code, list all user-facing text:

```javascript
// Example: New "Analytics" feature

// Translation keys needed:
// analytics.title
// analytics.viewStats
// analytics.period.daily
// analytics.period.weekly
// analytics.period.monthly
// analytics.metric.views
// analytics.metric.clicks
// analytics.noData
// analytics.loadingChart
```

### Step 2: Add to Translation Files

Create entries in `/front/static/i18n/`:

**en.json:**
```json
{
  "analytics": {
    "title": "Analytics Dashboard",
    "viewStats": "View Statistics",
    "period": {
      "daily": "Daily",
      "weekly": "Weekly",
      "monthly": "Monthly"
    },
    "metric": {
      "views": "Views",
      "clicks": "Clicks"
    },
    "noData": "No data available",
    "loadingChart": "Loading chart..."
  }
}
```

Then translate to other languages: **es.json, fr.json, hi.json, ar.json, jp.json**

### Step 3: Implement with i18n

```javascript
import { t } from "../../i18n/i18n.js";

const renderAnalyticsDashboard = () => {
  const container = createElement("div", { class: "analytics-dashboard" });
  
  // Title
  const title = createElement("h1", {}, [t("analytics.title")]);
  
  // Period selector
  const periodSelect = createElement("select", {}, [
    createElement("option", { value: "daily" }, [t("analytics.period.daily")]),
    createElement("option", { value: "weekly" }, [t("analytics.period.weekly")]),
    createElement("option", { value: "monthly" }, [t("analytics.period.monthly")])
  ]);
  
  // Metrics
  const viewsLabel = t("analytics.metric.views");
  const clicksLabel = t("analytics.metric.clicks");
  
  // Loading state
  const loadingText = t("analytics.loadingChart");
  
  // No data state
  const noDataText = t("analytics.noData");
  
  container.appendChild(title);
  container.appendChild(periodSelect);
  
  return container;
};
```

---

## Template: Handling Dynamic Content

### With Simple Variables

```javascript
// Translation file:
{
  "userGreeting": "Welcome, {userName}!"
}

// Code:
const greeting = t("userGreeting", { userName: userProfile.name });
```

### With Pluralization

```javascript
// Translation file:
{
  "notification": {
    "one": "You have 1 new message",
    "other": "You have {count} new messages"
  }
}

// Code:
const messageCount = unreadMessages.length;
const notification = t("notification", { count: messageCount });
```

### With Multiple Variables

```javascript
// Translation file:
{
  "eventDetails": "Event '{eventName}' on {date} at {location}"
}

// Code:
const details = t("eventDetails", {
  eventName: event.name,
  date: event.date,
  location: event.location
});
```

---

## Template: Handling Complex UI

### Button with Translation

```javascript
// Don't hardcode:
const saveBtn = createElement("button", {}, ["Save"]);

// Do this:
import { t } from "../../i18n/i18n.js";

const saveBtn = createElement("button", {}, [t("common.save")]);
```

### Form Labels

```javascript
const form = createElement("form", {}, [
  createElement("label", {}, [t("auth.email")]),
  createElement("input", { type: "email" }),
  
  createElement("label", {}, [t("auth.password")]),
  createElement("input", { type: "password" }),
  
  createElement("button", { type: "submit" }, [t("common.submit")])
]);
```

### Conditional Messages

```javascript
if (error) {
  message.textContent = t("common.error");
  message.class = "error-class";
} else if (success) {
  message.textContent = t("common.success");
  message.class = "success-class";
}
```

---

## Template: Navigation Item with i18n

### Static Navigation

```javascript
// In /js/components/navigation.js

const navItems = [
  { href: "/analytics", label: t("nav.analytics") },
  { href: "/settings", label: t("nav.settings") },
  { href: "/help", label: t("nav.help") }
];
```

### Dynamic Navigation Groups

```javascript
const navigationGroups = {
  main: [
    { href: "/farms", label: t("nav.farms") },
    { href: "/recipes", label: t("nav.recipes") }
  ],
  social: [
    { href: "/posts", label: t("nav.posts") },
    { href: "/artists", label: t("nav.artists") }
  ]
};
```

---

## Anti-Patterns to Avoid

### ❌ Hardcoding strings

```javascript
// DON'T:
button.textContent = "Save";
label.innerHTML = "Job Title";
element.setAttribute("placeholder", "Search jobs...");
element.title = "Click to view";
```

### ✅ Use translations

```javascript
// DO:
button.textContent = t("common.save");
label.innerHTML = t("baito.jobTitle");
element.setAttribute("placeholder", t("baito.searchPlaceholder"));
element.title = t("baito.viewApplicants");
```

### ❌ String concatenation in code

```javascript
// DON'T:
const message = "User " + name + " was " + status;
const count = `There are ${items} items`;
```

### ✅ Use template interpolation

```javascript
// DO:
const message = t("userStatus", { name, status });
const count = t("itemCount", { count: items });
```

### ❌ Mixing languages

```javascript
// DON'T:
const message = t("payment.success") + " - Amount: " + amount;
```

### ✅ Keep translations together

```javascript
// DO:
// Add to translation files:
// "payment": { "successAmount": "Payment successful - Amount: {amount}" }
const message = t("payment.successAmount", { amount });
```

---

## Checklist for New Features

- [ ] Identify all user-facing text
- [ ] Create translation keys (use semantic naming)
- [ ] Add to all 6 language files (en, es, fr, hi, ar, jp)
- [ ] Import `t` function from i18n
- [ ] Replace all hardcoded strings with `t()` calls
- [ ] Test with at least 2 different languages
- [ ] Verify pluralization works (if applicable)
- [ ] Check variable interpolation
- [ ] Verify no console warnings about missing translations
- [ ] Update I18N_GUIDE.md if adding new sections

---

## Testing i18n Implementation

### Manual Testing

```javascript
// In browser console:

// Test a simple translation
t("nav.farms");

// Test with variables
t("baito.acceptedStub", { name: "John" });

// Test pluralization
t("jobCount", { count: 1 });
t("jobCount", { count: 5 });

// Change language and reload
localStorage.setItem("lang", "es");
location.reload(); // Page should be in Spanish
```

### Unit Testing (if using Jest)

```javascript
import { t } from "../i18n/i18n.js";

describe("i18n translations", () => {
  test("should translate simple key", () => {
    expect(t("nav.farms")).toBe("Farms");
  });

  test("should interpolate variables", () => {
    expect(t("baito.acceptedStub", { name: "John" }))
      .toBe("Accepted John");
  });

  test("should handle pluralization", () => {
    expect(t("jobCount", { count: 1 }))
      .toBe("1 job available");
    expect(t("jobCount", { count: 5 }))
      .toBe("5 jobs available");
  });
});
```

---

## Common Patterns

### Pattern 1: Status Badges

```javascript
const getStatusText = (status) => {
  const statusMap = {
    pending: t("baito.pending"),
    accepted: t("baito.accepted"),
    rejected: t("baito.rejected")
  };
  return statusMap[status];
};
```

### Pattern 2: Time-based Messages

```javascript
const getTimeMessage = (minutes) => {
  if (minutes === 1) {
    return t("time.oneMinute");
  } else if (minutes === 60) {
    return t("time.oneHour");
  } else if (minutes < 60) {
    return t("time.minutesAgo", { minutes });
  } else {
    return t("time.hoursAgo", { hours: Math.floor(minutes / 60) });
  }
};
```

### Pattern 3: Error Messages

```javascript
const getErrorMessage = (errorCode) => {
  const errors = {
    AUTH_001: t("errors.invalidEmail"),
    AUTH_002: t("errors.passwordTooShort"),
    PAYMENT_001: t("errors.paymentFailed"),
    UPLOAD_001: t("errors.fileTooLarge")
  };
  return errors[errorCode] || t("common.error");
};
```

### Pattern 4: Dynamic Lists

```javascript
const renderMenuItems = (items) => {
  return items.map(item => {
    const label = t(`menu.${item.key}`);
    return createElement("li", {}, [label]);
  });
};
```

---

## Updating Existing Code

### Migration Checklist

When refactoring existing code to be i18n-friendly:

1. **Identify hardcoded strings**
   ```bash
   grep -r "textContent\|innerHTML\|placeholder\|title" js/ | grep -v ".js:"
   ```

2. **Group related strings by feature**
   - baito-related strings → `baito` section
   - navigation labels → `nav` section
   - common actions → `common` section

3. **Create translation keys**
   - Use descriptive names
   - Follow existing naming patterns
   - Be consistent across languages

4. **Update code**
   - Import `t` function
   - Replace hardcoded strings
   - Test multiple languages

5. **Check for missing translations**
   - Look for console warnings
   - Run `t()` function with all keys in console

---

## Performance Optimization

### Caching Translations

The i18n system already caches translations in memory:

```javascript
// First call loads from file
t("nav.farms"); // Fetches from JSON

// Subsequent calls use cache
t("nav.farms"); // Uses cached value
```

### Lazy Loading (Advanced)

For large applications, you can split translations:

```javascript
// Load feature-specific translations on demand
const loadAnalyticsTranslations = async () => {
  const lang = getCurrentLanguage();
  const translations = await fetch(`/static/i18n/${lang}/analytics.json`);
  // Merge with main translations
};
```

---

## Maintenance

### Regular Tasks

- [ ] Review new code for hardcoded strings
- [ ] Update translations when features change
- [ ] Keep all language files in sync
- [ ] Test language switching periodically
- [ ] Update this guide as patterns emerge

### When Deprecating Text

1. Mark as deprecated in all translation files
2. Don't delete - translators may need context
3. Update code to use new keys
4. Remove after next release cycle

---

## Resources

- **i18n Module:** `/front/js/i18n/i18n.js`
- **Translation Files:** `/front/static/i18n/`
- **Full Guide:** `/front/I18N_GUIDE.md`
- **Footer Component:** `/front/js/components/footer.js` (language selector)

