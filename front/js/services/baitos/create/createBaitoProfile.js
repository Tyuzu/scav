import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/index.js";
import { apiFetch } from "../../../api/api.js";
import { createFormGroup } from "../../../components/createFormGroup.js";
import Button from "../../../components/base/Button.js";
import Notify from "../../../components/ui/Notify.mjs";


export async function displayCreateBaitoProfile(isLoggedIn, contentContainer) {
    displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "create", null);
}

export async function displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, mode = "create", workerId = null) {
    contentContainer.replaceChildren();

    if (!isLoggedIn) {
        Notify("Login required.", { type: "warning", duration: 3000, dismissible: true });
        navigate("/login");
        return;
    }

    const section = createElement("div", { class: "create-section" });
    const form = createElement("form", { "aria-label": `${mode === "create" ? "Create" : "Edit"} Worker Profile` });
    const bioCounter = createElement("small", { class: "char-count", "aria-live": "polite" });

    const fields = [
        { label: "Full Name", type: "text", id: "profile-name", required: true, placeholder: "e.g. Yuki Tanaka" },
        { label: "Age", type: "number", id: "profile-age", required: true, placeholder: "e.g. 22", additionalProps: { min: 16 } },
        { label: "Phone Number", type: "text", id: "profile-phone", required: true, placeholder: "e.g. 080-1234-5678" },
        { label: "Email", type: "email", id: "profile-email", placeholder: "e.g. yuki@example.com" },
        { label: "Location", type: "text", id: "profile-location", required: true, placeholder: "e.g. Shibuya, Tokyo" },
        { label: "Preferred Roles", type: "text", id: "profile-roles", required: true, placeholder: "e.g. Waiter, Cashier" },
        { label: "Preferred Industry", type: "select", id: "profile-category", required: true, options: ["Food & Beverage", "Retail", "Delivery", "Cleaning", "Hospitality", "Education", "Office", "IT"] },
        { label: "Experience", type: "textarea", id: "profile-experience", placeholder: "Previous work experience" },
        { label: "Skills / Certifications", type: "text", id: "profile-skills", placeholder: "e.g. Japanese N2, Cashier Certified" },
        { label: "Availability", type: "text", id: "profile-availability", placeholder: "e.g. Weekends, Evenings" },
        { label: "Expected Wage (Yen/hour)", type: "number", id: "profile-wage", placeholder: "e.g. 1200", additionalProps: { min: 1 } },
        { label: "Languages Spoken", type: "text", id: "profile-languages", placeholder: "e.g. Japanese, English" },
        { label: "Bio", type: "textarea", id: "profile-bio", placeholder: "Brief intro...", additionalProps: { maxlength: 500 }, additionalNodes: [bioCounter] },
        { label: "Additional Documents / Certificates", type: "file", id: "profile-documents", accept: ".pdf,.jpg,.png", multiple: true }
    ];

    // render form fields
    fields.forEach(f => form.appendChild(createFormGroup(f)));

    const bioInput = form.querySelector("#profile-bio");
    bioInput.addEventListener("input", e => {
        bioCounter.textContent = `${e.target.value.length} / 500 characters`;
    });

    // Prefill when editing
    if (mode === "edit" && workerId) {
        try {
            const worker = await apiFetch(`/baitos/worker/${workerId}`);
            form.querySelector("#profile-name").value = worker.name || "";
            form.querySelector("#profile-age").value = worker.age || "";
            form.querySelector("#profile-phone").value = worker.phone_number || "";
            form.querySelector("#profile-email").value = worker.email || "";
            form.querySelector("#profile-location").value = worker.address || "";
            form.querySelector("#profile-roles").value = Array.isArray(worker.preferred_roles)
                ? worker.preferred_roles.join(", ")
                : worker.preferred_roles || "";
            form.querySelector("#profile-category").value = worker.category || "";
            form.querySelector("#profile-experience").value = worker.experience || "";
            form.querySelector("#profile-skills").value = worker.skills || "";
            form.querySelector("#profile-availability").value = worker.availability || "";
            form.querySelector("#profile-wage").value = worker.expected_wage || "";
            form.querySelector("#profile-languages").value = worker.languages || "";
            form.querySelector("#profile-bio").value = worker.bio || "";
            bioCounter.textContent = `${worker.bio?.length || 0} / 500 characters`;
        } catch (err) {
            Notify("Failed to load worker data for editing.", { type: "error", duration: 3000, dismissible: true });
        }
    } else {
        // Prefill from draft when creating
        const draft = JSON.parse(localStorage.getItem("baitoProfileDraft") || "{}");
        Object.entries(draft).forEach(([key, value]) => {
            const el = form.querySelector(`#${key}`);
            if (el && el.type !== "file") el.value = value;
        });
    }

    const submitBtn = Button(mode === "create" ? "Create Profile" : "Update Profile", "profile-submit-btn", {}, "btn btn-primary");

    // Save draft for CREATE mode
    if (mode === "create") {
        form.addEventListener("input", () => {
            const draftData = {};
            fields.forEach(f => {
                const el = form.querySelector(`#${f.id}`);
                if (el && el.type !== "file") draftData[f.id] = el.value;
            });
            localStorage.setItem("baitoProfileDraft", JSON.stringify(draftData));
        });
    }

    // Submit logic
    form.addEventListener("submit", async e => {
        e.preventDefault();
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const payload = new FormData();

        const requiredFields = {
            name: formData.get("profile-name")?.trim(),
            age: formData.get("profile-age"),
            phone: formData.get("profile-phone")?.trim(),
            location: formData.get("profile-location")?.trim(),
            roles: formData.get("profile-roles")?.split(",").map(r => r.trim()).filter(Boolean),
            category: formData.get("profile-category"),
            bio: formData.get("profile-bio")?.trim()
        };

        if (Object.values(requiredFields).some(v => !v || (Array.isArray(v) && !v.length))) {
            Notify("Please fill all required fields.", { type: "warning", duration: 3000, dismissible: true });
            submitBtn.disabled = false;
            return;
        }

        if (Number(requiredFields.age) < 16) {
            Notify("Minimum age is 16.", { type: "warning", duration: 3000, dismissible: true });
            submitBtn.disabled = false;
            return;
        }

        Object.entries(requiredFields).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(val => payload.append(k, val));
            else payload.append(k, v);
        });

        // Append optional fields
        ["profile-email", "profile-experience", "profile-skills", "profile-availability", "profile-wage", "profile-languages"].forEach(id => {
            const val = formData.get(id);
            if (val && val.trim()) payload.append(id.replace("profile-", ""), val.trim());
        });

        // Handle additional documents
        const documents = form.querySelector("#profile-documents")?.files;
        if (documents?.length) {
            Array.from(documents).forEach(file => payload.append("documents", file));
        }

        try {
            if (mode === "create") {
                Notify("Creating profile...", { type: "info", duration: 3000, dismissible: true });
                await apiFetch("/baitos/profile", "POST", payload);
                localStorage.removeItem("baitoProfileDraft");
                Notify("Profile created successfully!", { type: "success", duration: 3000, dismissible: true });
            } else {
                Notify("Updating profile...", { type: "info", duration: 3000, dismissible: true });
                await apiFetch(`/baitos/profile/${workerId}`, "PUT", payload);
                Notify("Profile updated successfully!", { type: "success", duration: 3000, dismissible: true });
            }
            navigate("/baitos/hire");
        } catch (err) {
            Notify(`Error: ${err?.message || err || "Profile save failed."}`, { type: "error", duration: 3000, dismissible: true });
        } finally {
            submitBtn.disabled = false;
        }
    });

    form.appendChild(submitBtn);
    section.appendChild(createElement("h2", {}, [mode === "create" ? "Create Worker Profile" : "Edit Worker Profile"]));
    section.appendChild(form);
    contentContainer.appendChild(section);
}
