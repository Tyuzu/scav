import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/index.js";
import { apiFetch } from "../../../api/api.js";
import { createFormGroup } from "../../../components/createFormGroup.js";
import Notify from "../../../components/ui/Notify.mjs";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";

// --- Category Data ---
const categoryMap = {
  Food: ["Waiter", "Cook", "Delivery", "Cleaning", "Dishwasher", "Barista"],
  Health: ["Reception", "Cleaner", "Helper", "Caregiver", "Nurse Assistant"],
  Retail: ["Cashier", "Stock", "Floor Staff", "Merchandiser"],
  Hospitality: ["Housekeeping", "Front Desk", "Server", "Bartender", "Event Staff"],
  Office: ["Clerical", "Data Entry", "Receptionist", "Assistant"],
  Education: ["Tutor", "Teaching Assistant", "Language Teacher", "Childcare"],
  Logistics: ["Warehouse", "Delivery", "Driver", "Mover"],
  IT: ["Support", "Testing", "Junior Developer", "Web Admin"],
  Creative: ["Designer", "Photographer", "Editor", "Content Creator"],
  Construction: ["Laborer", "Helper", "Carpenter", "Painter"],
  Other: ["Manual Labor", "Seasonal Work", "Event Help", "Miscellaneous"]
};

// --- Utility: build select options ---
function populateSelect(select, options, selectedValue = "") {
  select.replaceChildren();
  const placeholder = createElement("option", { value: "", disabled: true, selected: true }, ["Select role type"]);
  select.appendChild(placeholder);
  options.forEach(opt => {
    const o = createElement("option", { value: opt }, [opt]);
    select.appendChild(o);
  });
  select.value = selectedValue || "";
}

// --- Create all form groups ---
function buildForm(baito) {
  const form = createElement("form", { enctype: "multipart/form-data" });

  // Category + subcategory
  const categoryGroup = createFormGroup({
    label: "Job Category",
    type: "select",
    id: "category-main",
    required: true,
    placeholder: "Select category",
    options: Object.keys(categoryMap).map(k => ({ value: k, label: k })),
    value: baito.category || ""
  });
  const subcategoryGroup = createFormGroup({
    label: "Role Type",
    type: "select",
    id: "category-sub",
    required: true,
    placeholder: "Select role type",
    options: [],
    value: baito.subcategory || ""
  });

  form.append(categoryGroup, subcategoryGroup);

  // Other fields
  const descriptionCounter = createElement("small", { class: "char-count" });
  const reqCounter = createElement("small", { class: "char-count" });

  const fields = [
    { label: "Job Title", type: "text", id: "baito-title", required: true, value: baito.title || "", placeholder: "Enter job title" },
    { label: "Working Hours", type: "text", id: "baito-workinghours", required: true, value: baito.workHours || "", placeholder: "e.g. 9:00-17:00" },
    { label: "Description", type: "textarea", id: "baito-description", required: true, value: baito.description || "", placeholder: "Job description", additionalNodes: [descriptionCounter] },
    { label: "Requirements", type: "textarea", id: "baito-requirements", required: true, value: baito.requirements || "", placeholder: "Requirements", additionalNodes: [reqCounter] },
    { label: "Tags (comma separated)", type: "text", id: "baito-tags", value: (baito.tags || []).join(", "), placeholder: "e.g. part-time, weekend" },
    { label: "Location", type: "text", id: "baito-location", required: true, value: baito.location || "", placeholder: "Enter location" },
    { label: "Wage per Hour", type: "number", id: "baito-wage", required: true, value: baito.wage || "", additionalProps: { min: 1 }, placeholder: "Wage Per Hour" },
    { label: "Benefits", type: "text", id: "baito-benefits", value: baito.benefits || "", placeholder: "e.g. Free meals, transport allowance" },
    { label: "Phone Number", type: "text", id: "baito-phone", required: true, value: baito.phone || "", placeholder: "Enter phone number" },
    { label: "Email", type: "email", id: "baito-email", value: baito.email || "", placeholder: "Enter email address" },
  ];

  fields.forEach(f => form.appendChild(createFormGroup(f)));
  return { form, descriptionCounter, reqCounter };
}

// --- Validation ---
function validateForm(form) {
  const fd = new FormData(form);
  const requiredFields = {
    title: fd.get("baito-title")?.trim(),
    workHours: fd.get("baito-workinghours")?.trim(),
    description: fd.get("baito-description")?.trim(),
    requirements: fd.get("baito-requirements")?.trim(),
    location: fd.get("baito-location")?.trim(),
    wage: fd.get("baito-wage"),
    phone: fd.get("baito-phone")?.trim(),
    category: fd.get("category-main"),
    subcategory: fd.get("category-sub")
  };

  if (Object.values(requiredFields).some(v => !v)) {
    Notify("Please fill in all required fields.", { type: "warning", duration: 3000, dismissible: true });
    return null;
  }
  if (Number(requiredFields.wage) <= 0) {
    Notify("Wage must be greater than 0.", { type: "warning", duration: 3000, dismissible: true });
    return null;
  }
  return { fd, requiredFields };
}

// --- Payload builder ---
function buildPayload(fd, requiredFields, form) {
  const payload = new FormData();
  Object.entries(requiredFields).forEach(([k, v]) => payload.append(k, v));

  const tags = fd.get("baito-tags")?.trim();
  if (tags) payload.append("tags", tags);
  const benefits = fd.get("baito-benefits")?.trim();
  if (benefits) payload.append("benefits", benefits);
  const email = fd.get("baito-email")?.trim();
  if (email) payload.append("email", email);

  return payload;
}

// --- Main function ---
export async function createOrEditBaito({ mode = "create", baito = {}, isLoggedIn = false, contentContainer = null }) {
  const container = contentContainer || document.querySelector("#content");
  container.replaceChildren();

  if (mode === "create" && !isLoggedIn) {
    Notify("You must be logged in to post a job (baito).", { type: "warning", duration: 3000, dismissible: true });
    navigate("/login");
    return;
  }

  const section = createElement("div", { class: "create-section" });
  container.appendChild(section);

  const { form, descriptionCounter, reqCounter } = buildForm(baito);

  // --- Subcategory init ---
  const subSelect = form.querySelector("#category-sub");
  if (baito.category && categoryMap[baito.category]) {
    populateSelect(subSelect, categoryMap[baito.category], baito.subcategory);
  }

  // --- Event bindings ---
  form.querySelector("#category-main").addEventListener("change", e => {
    populateSelect(subSelect, categoryMap[e.target.value] || []);
  });

  form.querySelector("#baito-description").addEventListener("input", e => {
    descriptionCounter.textContent = `${e.target.value.length} characters`;
  });
  form.querySelector("#baito-requirements").addEventListener("input", e => {
    reqCounter.textContent = `${e.target.value.length} characters`;
  });

  // --- Submit ---
  const submitBtn = createElement("button", { type: "submit", class: "btn btn-primary" },
    [mode === "edit" ? "Update Baito" : "Create Baito"]);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    submitBtn.disabled = true;

    const result = validateForm(form);
    if (!result) { submitBtn.disabled = false; return; }

    const { fd, requiredFields } = result;
    const payload = buildPayload(fd, requiredFields, form);

    try {
      if (mode === "edit") {
        Notify("Updating baito...", { type: "info", duration: 3000, dismissible: true });
        await apiFetch(`/baitos/baito/${baito.baitoid}`, "PUT", payload);
        Notify("Baito updated successfully!", { type: "success", duration: 3000, dismissible: true });
        navigate(`/baito/${baito.baitoid}`);
      } else {
        Notify("Creating baito...", { type: "info", duration: 3000, dismissible: true });
        const result = await apiFetch("/baitos/baito", "POST", payload);
        Notify("Baito created successfully!", { type: "success", duration: 3000, dismissible: true });
        navigate(`/baito/${result.baitoid}`);
      }
    } catch (err) {
      Notify(`Error: ${err.message || "Failed to save baito."}`, { type: "error", duration: 3000, dismissible: true });
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.appendChild(submitBtn);
  section.append(createElement("h2", {}, [mode === "edit" ? "Edit Baito" : "Create Baito"]), form);
}
