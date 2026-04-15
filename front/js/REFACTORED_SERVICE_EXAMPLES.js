/**
 * REFACTORED SERVICE EXAMPLES
 * 
 * Real-world examples showing how to refactor existing service files
 * to use the new Form Validation System
 */

// ═════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Simple Menu/Product Form
// ═════════════════════════════════════════════════════════════════════════════

import { FormHandler } from '../validation/FormHandler.js';
import { validators } from '../validation/validators.js';
import { validationSchemas } from '../validation/validationSchemas.js';
import { createFormGroup } from '../components/createFormGroup.js';
import Modal from '../components/ui/Modal.mjs';
import { apiFetch } from '../api/api.js';
import Notify from '../components/ui/Notify.mjs';

// Define validation schema once at module level
const MENU_VALIDATION = {
  "menu-name": validators.compose(
    validators.required,
    validators.minLength(3),
    validators.maxLength(100)
  ),
  "menu-price": validationSchemas.number.price(),
  "menu-stock": validators.compose(
    validators.required,
    validators.number,
    validators.min(0)
  )
};

/**
 * Create menu form (reusable form builder)
 * Old: Each form was inline in the handler function
 * New: Extracted into dedicated function - easier to test, reuse, and maintain
 */
function createMenuFormHandler(menu = {}, isEdit = false) {
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
        validator: MENU_VALIDATION["menu-name"],
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "menu-price",
        name: "price",
        label: "Price",
        type: "number",
        value: menu.price || "",
        placeholder: "0.00",
        validator: MENU_VALIDATION["menu-price"],
        additionalProps: { min: 0, step: "0.01" }
      }),
      createFormGroup({
        id: "menu-stock",
        name: "stock",
        label: "Stock Available",
        type: "number",
        value: menu.stock || "",
        placeholder: "0",
        validator: MENU_VALIDATION["menu-stock"],
        additionalProps: { min: 0 }
      })
    ]
  });
}

/**
 * Add menu
 * Only handles API call and UI updates - no validation logic needed
 */
async function addMenu(placeId, menuList) {
  const handler = createMenuFormHandler();
  
  handler.onSubmit = async (data) => {
    // Data is already validated by FormHandler
    // No need for manual validation checks
    try {
      const response = await apiFetch(`/places/menu/${placeId}`, "POST", data);
      
      if (response?.data?.menuid) {
        Notify("Menu added successfully!", { type: "success", duration: 3000 });
        // Refresh list or update UI
        menuList.prepend(createMenuCard(response.data, true, true, placeId));
      }
    } catch (error) {
      Notify(`Error: ${error.message}`, { type: "error" });
      throw error; // FormHandler will handle the error
    }
  };
  
  handler.onCancel = () => modal.close();

  const modal = Modal({
    title: "Add Menu",
    content: handler.createForm()
  });
}

/**
 * Edit menu
 * Clean separation between data loading, form creation, and submission
 */
async function editMenu(menuId, placeId) {
  try {
    const menu = await apiFetch(`/places/menu/${placeId}/${menuId}`, 'GET');
    const handler = createMenuFormHandler(menu, true);
    
    handler.onSubmit = async (data) => {
      const response = await apiFetch(
        `/places/menu/${placeId}/${menuId}`,
        "PUT",
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (response.success) {
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


// ═════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Song/Audio Upload Form with File Validation
// ═════════════════════════════════════════════════════════════════════════════

const SONG_VALIDATION = {
  title: validators.compose(validators.required, validators.minLength(3)),
  genre: validators.compose(validators.required, validators.minLength(2)),
  duration: validators.pattern(
    /^\d+:\d{2}$/,
    "Duration must be in MM:SS format"
  ),
  description: validators.maxLength(500),
  audio: validators.compose(
    validationSchemas.file.audio(),
    validators.fileSize(50 * 1024 * 1024) // 50MB max
  ),
  poster: validationSchemas.file.imageOptional()
};

/**
 * Create song form with file validation
 */
function createSongFormHandler(song = {}, isEdit = false) {
  const audioPreview = document.createElement("audio");
  audioPreview.controls = true;
  audioPreview.style.display = "none";
  audioPreview.style.marginTop = "10px";

  const imagePreview = document.createElement("img");
  imagePreview.style.display = "none";
  imagePreview.style.maxHeight = "120px";
  imagePreview.style.marginTop = "10px";

  return new FormHandler({
    id: "song-form",
    submitButtonText: isEdit ? "Save Changes" : "Add Song",
    showCancelButton: true,
    fields: [
      createFormGroup({
        id: "title",
        name: "title",
        label: "Song Title",
        type: "text",
        value: song.title || "",
        placeholder: "Enter song title",
        validator: SONG_VALIDATION.title,
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "genre",
        name: "genre",
        label: "Genre",
        type: "text",
        value: song.genre || "",
        placeholder: "e.g., Rock, Pop, Jazz",
        validator: SONG_VALIDATION.genre,
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "duration",
        name: "duration",
        label: "Duration (MM:SS)",
        type: "text",
        value: song.duration || "",
        placeholder: "3:45",
        validator: SONG_VALIDATION.duration,
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "description",
        name: "description",
        label: "Description",
        type: "textarea",
        value: song.description || "",
        placeholder: "Optional: describe this song",
        validator: SONG_VALIDATION.description,
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "audio",
        name: "audio",
        label: "Audio File",
        type: "file",
        accept: "audio/*",
        validator: SONG_VALIDATION.audio,
        validationTrigger: "change",
        additionalNodes: [audioPreview]
      }),
      createFormGroup({
        id: "poster",
        name: "poster",
        label: "Cover Image (Optional)",
        type: "file",
        accept: "image/*",
        validator: SONG_VALIDATION.poster,
        additionalNodes: [imagePreview]
      })
    ]
  });
}

/**
 * Upload song
 * Handles both file uploads and metadata
 */
async function uploadSong(artistID, isEdit = false, song = {}) {
  const handler = createSongFormHandler(song, isEdit);
  
  handler.onSubmit = async (data) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append("title", data.title);
      formData.append("genre", data.genre);
      formData.append("duration", data.duration);
      formData.append("description", data.description);
      
      // Add files if provided
      if (data.audio && data.audio.length > 0) {
        formData.append("audio", data.audio[0]);
      }
      
      if (data.poster && data.poster.length > 0) {
        formData.append("poster", data.poster[0]);
      }
      
      const url = isEdit
        ? `/artists/${artistID}/songs/${encodeURIComponent(song.songid)}/edit`
        : `/artists/${artistID}/songs`;
      
      const method = isEdit ? "PUT" : "POST";
      
      await apiFetch(url, method, formData);
      Notify("Song saved successfully!", { type: "success" });
      modal.close();
    } catch (error) {
      Notify(`Upload failed: ${error.message}`, { type: "error" });
      throw error;
    }
  };

  Modal({
    title: isEdit ? `Edit Song: ${song.title}` : "Upload New Song",
    content: handler.createForm(),
    onClose: () => {} // FormHandler handles cancellation
  });
}


// ═════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Complex Form with Conditional Fields and Dynamic Validation
// ═════════════════════════════════════════════════════════════════════════════

const BOOKING_VALIDATION = {
  "event-date": validators.compose(
    validators.required,
    validators.date,
    (value) => {
      const eventDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today ? null : "Event date must be in the future";
    }
  ),
  "time-slot": validators.required,
  "guest-count": validators.compose(
    validators.required,
    validators.number,
    validators.range(1, 1000)
  ),
  "special-requests": validators.maxLength(1000),
  "payment-method": validators.required
};

/**
 * Booking form with conditional validation
 */
function createBookingFormHandler(initialData = {}) {
  return new FormHandler({
    id: "booking-form",
    submitButtonText: "Complete Booking",
    showCancelButton: true,
    fields: [
      createFormGroup({
        id: "event-date",
        name: "eventDate",
        label: "Event Date",
        type: "date",
        value: initialData.eventDate || "",
        validator: BOOKING_VALIDATION["event-date"],
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "time-slot",
        name: "timeSlot",
        label: "Time Slot",
        type: "select",
        value: initialData.timeSlot || "",
        placeholder: "Select a time",
        options: [
          { value: "morning", label: "Morning (9 AM - 12 PM)" },
          { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
          { value: "evening", label: "Evening (5 PM - 9 PM)" }
        ],
        validator: BOOKING_VALIDATION["time-slot"]
      }),
      createFormGroup({
        id: "guest-count",
        name: "guestCount",
        label: "Number of Guests",
        type: "number",
        value: initialData.guestCount || "",
        placeholder: "Expected guest count",
        validator: BOOKING_VALIDATION["guest-count"],
        additionalProps: { min: 1, max: 1000 }
      }),
      createFormGroup({
        id: "special-requests",
        name: "specialRequests",
        label: "Special Requests (Optional)",
        type: "textarea",
        value: initialData.specialRequests || "",
        placeholder: "Any special requirements?",
        validator: BOOKING_VALIDATION["special-requests"],
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "payment-method",
        name: "paymentMethod",
        label: "Payment Method",
        type: "select",
        value: initialData.paymentMethod || "",
        placeholder: "Select payment method",
        options: [
          { value: "card", label: "Credit/Debit Card" },
          { value: "upi", label: "UPI" },
          { value: "wallet", label: "Digital Wallet" }
        ],
        validator: BOOKING_VALIDATION["payment-method"]
      })
    ]
  });
}

/**
 * Create booking
 */
async function createBooking(venueId) {
  const handler = createBookingFormHandler();
  
  handler.onSubmit = async (data) => {
    try {
      const response = await apiFetch(
        `/venues/${venueId}/bookings`,
        "POST",
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (response.success) {
        Notify("Booking confirmed!", { type: "success" });
        // Process payment or stay on confirmation page
      }
    } catch (error) {
      Notify(`Booking failed: ${error.message}`, { type: "error" });
      throw error;
    }
  };

  Modal({
    title: "Create Booking",
    content: handler.createForm()
  });
}


// ═════════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Form with Custom Validators
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Custom async validator to check username availability
 */
function createUsernameValidator() {
  let timeout;
  return async (value) => {
    if (!value) return null;
    
    return new Promise((resolve) => {
      clearTimeout(timeout);
      
      // Debounce API call
      timeout = setTimeout(async () => {
        try {
          const response = await apiFetch(`/users/check-username/${value}`, "GET");
          const isAvailable = response.available;
          resolve(isAvailable ? null : "Username is already taken");
        } catch {
          resolve(null); // Don't block on API error
        }
      }, 500);
    });
  };
}

const PROFILE_VALIDATION = {
  username: validators.compose(
    validators.required,
    validators.minLength(3),
    validators.maxLength(20),
    validators.pattern(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _, and - allowed"),
    createUsernameValidator() // Custom async validator
  ),
  email: validationSchemas.text.email(),
  password: validationSchemas.text.password(),
  bio: validators.maxLength(500),
  website: validators.url
};

/**
 * User profile form with async validation
 */
function createProfileFormHandler(user = {}) {
  return new FormHandler({
    id: "profile-form",
    submitButtonText: "Save Profile",
    fields: [
      createFormGroup({
        id: "username",
        name: "username",
        label: "Username",
        type: "text",
        value: user.username || "",
        placeholder: "your_username",
        validator: PROFILE_VALIDATION.username,
        validationTrigger: "blur" // Async validators work better on blur
      }),
      createFormGroup({
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        value: user.email || "",
        placeholder: "user@example.com",
        validator: PROFILE_VALIDATION.email,
        validationTrigger: "blur"
      }),
      createFormGroup({
        id: "password",
        name: "password",
        label: "Password",
        type: "password",
        placeholder: "Leave blank to keep current password",
        validator: PROFILE_VALIDATION.password,
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "bio",
        name: "bio",
        label: "Bio",
        type: "textarea",
        value: user.bio || "",
        placeholder: "Tell us about yourself...",
        validator: PROFILE_VALIDATION.bio,
        validationTrigger: "change"
      }),
      createFormGroup({
        id: "website",
        name: "website",
        label: "Website (Optional)",
        type: "url",
        value: user.website || "",
        placeholder: "https://example.com",
        validator: PROFILE_VALIDATION.website
      })
    ]
  });
}


// ═════════════════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS FROM EXAMPLES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 1. DEFINE VALIDATION ONCE
 *    - Create validation schema at module level
 *    - Reuse across multiple forms
 *    - Easy to maintain and update
 * 
 * 2. EXTRACT FORM BUILDERS
 *    - Separate function for creating form handler
 *    - Makes forms reusable
 *    - Easier to test
 * 
 * 3. SEPARATE CONCERNS
 *    - Form creation: createFormHandler()
 *    - Logic: addMenu(), editMenu(), uploadSong()
 *    - No validation code in submit handlers
 * 
 * 4. USE COMPOSITION
 *    - Compose multiple validators for complex rules
 *    - Mix pre-built schemas with custom validators
 *    - Keep validators modular and reusable
 * 
 * 5. HANDLE ASYNC VALIDATION
 *    - Check username/email availability without blocking
 *    - Debounce API calls
 *    - Show loading state if needed
 * 
 * 6. CLEAN UP TECH DEBT
 *    - Remove manual validation from handlers
 *    - Remove duplicate validation logic
 *    - Reduce overall complexity
 */

export {
  createMenuFormHandler,
  addMenu,
  editMenu,
  createSongFormHandler,
  uploadSong,
  createBookingFormHandler,
  createBooking,
  createProfileFormHandler,
  MENU_VALIDATION,
  SONG_VALIDATION,
  BOOKING_VALIDATION,
  PROFILE_VALIDATION
};
