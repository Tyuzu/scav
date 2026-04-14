import { createElement } from "../../../components/createElement.js";
import Notify from "../../../components/ui/Notify.mjs";
import { loadVendors } from "./loadVendors.js";
import { vendorForm } from "./vendorForm.js";

/**
 * Main vendor management component
 * Displays vendor marketplace and registration form
 */
export async function hireVendors(anacon, isLoggedIn, eventId) {
    if (!isLoggedIn) {
        Notify("Please log in first.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    // Clear old content
    anacon.innerHTML = "";

    // Main wrapper with better styling
    const container = createElement("div", { id: "vendors-wrapper", class: "vendors-container" }, [
        createElement("div", { class: "vendors-header" }, [
            createElement("h2", { class: "vendors-title" }, ["Vendors Marketplace"]),
            createElement("p", { class: "vendors-subtitle" }, ["Hire multiple vendors for your event"])
        ])
    ]);

    // Load and display vendors
    const vendorListEl = await loadVendors(eventId, isLoggedIn);
    container.appendChild(vendorListEl);

    // Add vendor registration form if user isn't already a vendor
    const registrationSection = createElement("div", { class: "vendor-registration-section" }, [
        createElement("h3", { class: "registration-title" }, ["Want to Become a Vendor?"]),
        vendorForm(anacon, isLoggedIn, eventId)
    ]);
    container.appendChild(registrationSection);

    anacon.appendChild(container);

    // Add some basic styling
    addVendorStyles();
}

function addVendorStyles() {
    if (document.getElementById("vendor-styles")) return;

    const style = document.createElement("style");
    style.id = "vendor-styles";
    style.textContent = `
        .vendors-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .vendors-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 20px;
        }

        .vendors-title {
            font-size: 28px;
            font-weight: 600;
            margin: 0;
            color: #333;
        }

        .vendors-subtitle {
            font-size: 14px;
            color: #666;
            margin: 8px 0 0 0;
        }

        .vendor-registration-section {
            margin-top: 40px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }

        .registration-title {
            margin-top: 0;
            color: #333;
            font-size: 18px;
        }

        #vendor-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        #vendor-form input,
        #vendor-form textarea {
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }

        #vendor-form input:focus,
        #vendor-form textarea:focus {
            outline: none;
            border-color: #0066cc;
            box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        #vendor-form h4 {
            margin: 10px 0 15px 0;
            color: #333;
        }

        #vendors-list {
            margin-bottom: 30px;
        }

        #vendors-list h4 {
            margin-top: 0;
            color: #333;
        }

        .vendor-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .vendor-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            background: white;
            transition: all 0.3s ease;
        }

        .vendor-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #0066cc;
        }

        .vendor-card h5 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
        }

        .vendor-category {
            display: inline-block;
            background: #e8f0fe;
            color: #0066cc;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 12px;
        }

        .vendor-info {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 12px;
        }

        .vendor-rating {
            color: #ff9800;
            font-size: 13px;
            margin-bottom: 12px;
        }

        .vendor-actions {
            display: flex;
            gap: 8px;
        }

        .vendor-card button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .vendor-card button.hire-btn {
            background: #0066cc;
            color: white;
        }

        .vendor-card button.hire-btn:hover {
            background: #0052a3;
        }

        .vendor-card button.hire-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .no-vendors-message {
            text-align: center;
            padding: 40px 20px;
            color: #999;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}


