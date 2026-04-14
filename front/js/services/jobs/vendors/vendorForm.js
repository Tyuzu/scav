import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import Notify from "../../../components/ui/Notify.mjs";
import { hireVendors } from "./hireVendors.js";

/**
 * Vendor registration form component
 * Allows users to register as a vendor
 */
export function vendorForm(anacon, isLoggedIn, eventId) {
    const form = createElement("form", { id: "vendor-form", class: "vendor-registration-form" }, [
        createElement("h4", {}, ["List Yourself as a Vendor"]),

        createElement("input", {
            type: "text",
            placeholder: "Your Full Name",
            name: "name",
            required: true,
            class: "form-input"
        }),

        createElement("select", {
            name: "category",
            required: true,
            class: "form-input"
        }, [
            createElement("option", { value: "", selected: true, disabled: true }, ["Select a Category"]),
            createElement("option", { value: "Catering" }, ["Catering & Food Services"]),
            createElement("option", { value: "Entertainment" }, ["Entertainment & Music"]),
            createElement("option", { value: "Photography" }, ["Photography & Videography"]),
            createElement("option", { value: "Decoration" }, ["Decoration & Setup"]),
            createElement("option", { value: "Transportation" }, ["Transportation"]),
            createElement("option", { value: "Rentals" }, ["Equipment Rentals"]),
            createElement("option", { value: "Staffing" }, ["Staff & Personnel"]),
            createElement("option", { value: "Other" }, ["Other"])
        ]),

        createElement("textarea", {
            name: "description",
            placeholder: "Brief description of your services (optional)",
            class: "form-input",
            rows: 3
        }),

        createElement("input", {
            type: "email",
            placeholder: "Contact Email (optional)",
            name: "email",
            class: "form-input"
        }),

        createElement("input", {
            type: "tel",
            placeholder: "Contact Phone (optional)",
            name: "phone",
            class: "form-input"
        }),

        createElement("input", {
            type: "text",
            placeholder: "Location/Service Area (optional)",
            name: "location",
            class: "form-input"
        }),

        Button("Register as Vendor", "vendor-submit", {
            click: async (e) => {
                e.preventDefault();
                await handleVendorRegistration(anacon, isLoggedIn, eventId);
            }
        })
    ]);

    return form;
}

async function handleVendorRegistration(anacon, isLoggedIn, eventId) {
    const formEl = document.getElementById("vendor-form");
    const nameInput = formEl.querySelector("input[name='name']");
    const categoryInput = formEl.querySelector("select[name='category']");
    const descriptionInput = formEl.querySelector("textarea[name='description']");
    const emailInput = formEl.querySelector("input[name='email']");
    const phoneInput = formEl.querySelector("input[name='phone']");
    const locationInput = formEl.querySelector("input[name='location']");

    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const location = locationInput.value.trim();

    // Validation
    if (!name || !category) {
        Notify("Please fill in required fields (Name and Category).", {
            type: "warning",
            duration: 3000
        });
        return;
    }

    if (email && !isValidEmail(email)) {
        Notify("Please enter a valid email address.", {
            type: "warning",
            duration: 3000
        });
        return;
    }

    try {
        const submitBtn = document.getElementById("vendor-submit");
        submitBtn.disabled = true;
        submitBtn.textContent = "Registering...";

        const payload = {
            name,
            category,
            ...(description && { description }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(location && { location })
        };

        const response = await apiFetch(`/vendors`, "POST", payload);

        Notify("Vendor registered successfully! 🎉", {
            type: "success",
            duration: 3000
        });

        // Reset form
        formEl.reset();

        // Reload vendors list
        setTimeout(() => {
            hireVendors(anacon, isLoggedIn, eventId);
        }, 1000);
    } catch (error) {
        console.error("Vendor registration error:", error);
        Notify(
            error.message || "Failed to register vendor. Please try again.",
            { type: "error", duration: 3000 }
        );
    } finally {
        const submitBtn = document.getElementById("vendor-submit");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Register as Vendor";
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

