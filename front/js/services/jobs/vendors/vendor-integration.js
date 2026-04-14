/**
 * VENDOR SYSTEM INTEGRATION GUIDE
 * 
 * Shows how to integrate the vendor management system into your event management workflow
 */

// ============================================
// 1. IMPORT VENDOR COMPONENTS
// ============================================
import { hireVendors } from "./vendors.js";
import { apiFetch } from "../../../api/api.js";

// ============================================
// 2. EVENT MANAGEMENT INTEGRATION
// ============================================

/**
 * Add vendor management tab to event details
 * Call this when user views/edits an event
 */
export async function initEventVendorManagement(eventId, containerElement) {
    if (!containerElement) {
        console.error("Container element required");
        return;
    }

    // Create vendor tab
    const vendorTab = document.createElement("div");
    vendorTab.id = "event-vendors-tab";
    vendorTab.className = "event-section";

    // Load and display vendors for this event
    await loadEventVendorsSummary(eventId, vendorTab);

    containerElement.appendChild(vendorTab);
}

/**
 * Load summary of hired vendors for an event
 */
async function loadEventVendorsSummary(eventId, container) {
    try {
        const response = await apiFetch(`/vendors/events/${eventId}`, "GET");

        // Check if there was an API error
        if (response?.success === false) {
            console.error("API error loading vendors:", response.error);
            container.innerHTML = "<p>Failed to load vendors.</p>";
            return;
        }

        // Ensure vendors is an array (API might return object with vendors property)
        const vendors = Array.isArray(response) ? response : (response?.vendors || []);

        const summary = document.createElement("div");
        summary.className = "vendors-summary";

        if (!vendors || vendors.length === 0) {
            summary.innerHTML = `
                <h3>Event Vendors</h3>
                <p>No vendors hired yet for this event.</p>
                <button id="manage-vendors-btn" class="btn-primary">Manage Vendors</button>
            `;
        } else {
            summary.innerHTML = `
                <h3>Hired Vendors (${vendors.length})</h3>
                <div class="hired-vendors-list">
                    ${vendors.map(v => `
                        <div class="vendor-summary-item">
                            <h4>${v.name}</h4>
                            <span class="vendor-category">${v.category}</span>
                            ${v.rating ? `<div class="rating">⭐ ${v.rating}</div>` : ""}
                        </div>
                    `).join("")}
                </div>
                <button id="manage-vendors-btn" class="btn-primary">Manage Vendors</button>
            `;
        }

        container.appendChild(summary);

        // Add event listener for manage button
        const manageBtn = document.getElementById("manage-vendors-btn");
        if (manageBtn) {
            manageBtn.addEventListener("click", () => {
                openVendorManagementModal(eventId);
            });
        }
    } catch (error) {
        console.error("Error loading vendors summary:", error);
        container.innerHTML = "<p>Failed to load vendors.</p>";
    }
}

/**
 * Open vendor management modal for an event
 */
export function openVendorManagementModal(eventId) {
    const modal = document.createElement("div");
    modal.className = "vendor-management-modal modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    content.innerHTML = `
        <div class="modal-header">
            <h2>Manage Event Vendors</h2>
            <button class="close-btn">&times;</button>
        </div>
        <div id="vendor-management-container" class="modal-body"></div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Initialize vendor management
    const container = document.getElementById("vendor-management-container");
    hireVendors(container, true, eventId);

    // Handle close
    const closeBtn = content.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => {
        modal.remove();
    });
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ============================================
// 3. EVENT CREATION WORKFLOW
// ============================================

/**
 * Add vendor selection step to event creation form
 * Call after event is created
 */
export async function addVendorSelectionToEventCreation(eventId, formElement) {
    const vendorSection = document.createElement("div");
    vendorSection.className = "event-creation-section";
    vendorSection.innerHTML = `
        <h3>Vendors (Optional)</h3>
        <p>Hire vendors to provide services for your event</p>
        <div id="event-creation-vendors"></div>
    `;

    formElement.appendChild(vendorSection);

    // Initialize vendor selection
    const vendorContainer = document.getElementById("event-creation-vendors");
    hireVendors(vendorContainer, true, eventId);
}

// ============================================
// 4. USER PROFILE - VENDOR MODE
// ============================================

/**
 * Show vendor profile in user settings
 * Call when user is a vendor
 */
export async function showVendorProfile(userId, container) {
    try {
        // Get user data (should include vendor profile)
        const user = await apiFetch(`/users/${userId}`, "GET");

        // Check if there was an API error
        if (user?.success === false) {
            console.error("API error loading user:", user.error);
            container.innerHTML = "<p>Error loading profile</p>";
            return;
        }

        if (!user || !user.is_vendor) {
            container.innerHTML = `
                <div class="no-vendor-profile">
                    <h3>Become a Vendor</h3>
                    <p>Register as a vendor to start offering your services for events</p>
                    <button id="register-vendor-btn" class="btn-primary">Register as Vendor</button>
                </div>
            `;

            document.getElementById("register-vendor-btn").addEventListener("click", () => {
                openVendorRegistration();
            });
        } else {
            const vendorData = user.vendor_profile;
            container.innerHTML = `
                <div class="vendor-profile">
                    <h3>Your Vendor Profile</h3>
                    <div class="profile-field">
                        <label>Category:</label>
                        <span>${vendorData.category}</span>
                    </div>
                    <div class="profile-field">
                        <label>Rating:</label>
                        <span>⭐ ${vendorData.rating || "Not rated yet"}</span>
                    </div>
                    <div class="profile-field">
                        <label>Status:</label>
                        <span>${vendorData.verified ? "✓ Verified" : "Pending verification"}</span>
                    </div>
                    <button id="edit-vendor-btn" class="btn-secondary">Edit Profile</button>
                </div>
            `;

            document.getElementById("edit-vendor-btn").addEventListener("click", () => {
                openEditVendorProfile(userId);
            });
        }
    } catch (error) {
        console.error("Error loading vendor profile:", error);
        container.innerHTML = "<p>Error loading profile</p>";
    }
}

// ============================================
// 5. VENDOR REGISTRATION STANDALONE
// ============================================

export async function openVendorRegistration() {
    const modal = document.createElement("div");
    modal.className = "vendor-registration-modal modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    content.innerHTML = `
        <div class="modal-header">
            <h2>Register as a Vendor</h2>
            <button class="close-btn">&times;</button>
        </div>
        <div id="vendor-reg-container" class="modal-body"></div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // No event ID for standalone registration
    const container = document.getElementById("vendor-reg-container");
    hireVendors(container, true, null);

    // Handle close
    const closeBtn = content.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => {
        modal.remove();
    });
}

// ============================================
// 6. STYLE INJECTION
// ============================================

/**
 * Inject vendor system styles if not already present
 */
export function injectVendorStyles() {
    if (document.getElementById("vendor-system-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "vendor-system-styles";
    style.textContent = `
        /* Modal Styles */
        .modal {
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background-color: #fefefe;
            margin: auto;
            padding: 0;
            border-radius: 8px;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background: #f9f9f9;
        }

        .modal-header h2 {
            margin: 0;
            font-size: 20px;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: #999;
        }

        .close-btn:hover {
            color: #333;
        }

        .modal-body {
            padding: 20px;
        }

        /* Event Vendor Summary */
        .vendors-summary {
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #f9f9f9;
        }

        .hired-vendors-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            margin: 16px 0;
        }

        .vendor-summary-item {
            padding: 12px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
        }

        .vendor-summary-item h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
        }

        .vendor-category {
            display: inline-block;
            background: #e8f0fe;
            color: #0066cc;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }

        /* Buttons */
        .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #0066cc;
            color: white;
        }

        .btn-primary:hover {
            background: #0052a3;
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #d0d0d0;
        }

        /* Vendor Profile */
        .vendor-profile {
            padding: 20px;
            background: white;
            border-radius: 8px;
        }

        .profile-field {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .profile-field label {
            font-weight: 600;
            color: #333;
        }

        .profile-field span {
            color: #666;
        }
    `;

    document.head.appendChild(style);
}

// ============================================
// 7. INITIALIZATION
// ============================================

/**
 * Call this on app startup to set up vendor system
 */
export function initVendorSystem() {
    injectVendorStyles();
    console.warn("Vendor system initialized");
}

// Example usage:
// ============================================
// In your main app.js:
// import { initVendorSystem } from './services/jobs/vendors/vendor-integration.js';
// initVendorSystem();
//
// In event detail view:
// import { initEventVendorManagement } from './services/jobs/vendors/vendor-integration.js';
// await initEventVendorManagement(eventId, eventDetailsContainer);
//
// In user profile (vendor mode):
// import { showVendorProfile } from './services/jobs/vendors/vendor-integration.js';
// showVendorProfile(userId, profileContainer);
