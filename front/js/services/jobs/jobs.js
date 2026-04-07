import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import Modal from "../../components/ui/Modal.mjs";
import Notify from "../../components/ui/Notify.mjs";
import { createFormGroup } from "../../components/createFormGroup.js";
import { buildCard } from "../baitos/baitoslisting/JobCard.js";

// --- Category → Roles Map (light version) ---
const jobCategoryMap = {
  Food: ["Waiter", "Cook", "Delivery", "Cleaning", "Dishwasher", "Barista"],
  Retail: ["Cashier", "Stock", "Floor Staff"],
  Logistics: ["Warehouse", "Driver", "Mover"],
  Hospitality: ["Housekeeping", "Front Desk", "Server"],
  Construction: ["Laborer", "Carpenter", "Painter"],
  IT: ["Support", "Junior Developer", "Web Admin"],
  Office: ["Clerical", "Assistant", "Reception"],
  Other: ["General Help", "Seasonal", "Misc"]
};

// --- Utility: populate select options ---
function populateSelect(select, options, selected = "") {
  select.replaceChildren();

  const placeholder = createElement(
    "option",
    { value: "", disabled: true, selected: true },
    ["Select role type"]
  );
  select.appendChild(placeholder);

  options.forEach(opt => {
    const o = createElement("option", { value: opt }, [opt]);
    select.appendChild(o);
  });

  select.value = selected || "";
}

// --- Minimal Validator ---
function validateHirePayload(data) {
  if (!data.title || !data.description || !data.category || !data.subcategory) {
    Notify("Please fill in required fields.", { type: "error", duration: 3000 });
    return false;
  }
  return true;
}

// --- Build form with category + subcategory ---
function buildHireForm() {
  const form = createElement("form", { id: "hire-job-form", class: "create-section" });

  // Category select
  const categoryGroup = createFormGroup({
    label: "Category",
    type: "select",
    id: "job-category-main",
    required: true,
    placeholder: "Select a category",
    options: Object.keys(jobCategoryMap).map(k => ({ value: k, label: k }))
  });

  // Subcategory select (role)
  const roleGroup = createFormGroup({
    label: "Role Type",
    type: "select",
    id: "job-category-sub",
    required: true,
    placeholder: "Select role type",
    options: []
  });

  const otherFields = [
    { label: "Title", type: "text", id: "job-title", placeholder: "Job Title", required: true },
    { label: "Description", type: "textarea", id: "job-description", placeholder: "Job Description", required: true },
    { label: "Location", type: "text", id: "job-location", placeholder: "Location" },
    { label: "Wage", type: "text", id: "job-wage", placeholder: "Wage" }
  ];

  const groups = otherFields.map(f => createFormGroup(f));

  form.append(
    categoryGroup,
    roleGroup,
    ...groups
  );

  const submitBtn = Button("Create Job", "", { type: "submit" }, "buttonx btn-primary");
  form.appendChild(submitBtn);

  return form;
}

// --- Hire Job Modal ---
export function jobsHire(container, entityType, entityId) {
  const form = buildHireForm();

  const subSelect = form.querySelector("#job-category-sub");

  // Category change → update subcategory list
  form.querySelector("#job-category-main").addEventListener("change", e => {
    const selectedCat = e.target.value;
    const roles = jobCategoryMap[selectedCat] || [];
    populateSelect(subSelect, roles);
  });

  const { close: closeModal } = Modal({
    title: "Hire a Job",
    content: form,
    size: "medium",
    closeOnOverlayClick: true
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const jobData = {
      category: form.querySelector("#job-category-main")?.value.trim() || "",
      subcategory: form.querySelector("#job-category-sub")?.value.trim() || "",
      title: form.querySelector("#job-title")?.value.trim() || "",
      description: form.querySelector("#job-description")?.value.trim() || "",
      location: form.querySelector("#job-location")?.value.trim() || "",
      wage: form.querySelector("#job-wage")?.value.trim() || ""
    };

    if (!validateHirePayload(jobData)) {
return;
}

    try {
      const newJob = await apiFetch(
        `/jobs/${entityType}/${entityId}`,
        "POST",
        JSON.stringify(jobData),
        { "Content-Type": "application/json" }
      );

      if (!newJob || !newJob.baitoid) {
throw new Error("Failed to create job");
}

      const wrapper = container.querySelector(".places-wrapper");
      if (wrapper) {
wrapper.appendChild(buildCard(newJob));
}

      Notify("Job created successfully!", { type: "success", duration: 3000 });
      closeModal();
    } catch (err) {
      Notify(`Error creating job: ${err.message}`, { type: "error", duration: 5000 });
    }
  });
}

// --- Display Jobs ---
export async function displayPlaceJobs(container, isCreator, isLoggedIn, entityType, entityId) {
  container.replaceChildren();

  const title = createElement("h2", {}, ["Jobs"]);
  const jobsContainer = createElement("div", { class: "places-wrapper grid" });

  const elements = [title];

  if (isCreator) {
    const hireBtn = Button(
      "Hire",
      "hire-btn",
      { click: () => jobsHire(container, entityType, entityId) },
      "buttonx btn-primary"
    );
    elements.push(hireBtn);
  }

  container.append(...elements, jobsContainer);

  try {
    const response = await apiFetch(`/jobs/${entityType}/${entityId}`);
    const jobs = Array.isArray(response?.jobs) ? response.jobs : [];

    if (jobs.length === 0) {
      jobsContainer.appendChild(
        createElement("p", { class: "no-jobs" }, ["No jobs yet."])
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    jobs.forEach(job => {
      const card = buildCard(job);
      if (card) {
fragment.appendChild(card);
}
    });
    jobsContainer.appendChild(fragment);
  } catch {
    jobsContainer.appendChild(
      createElement("p", { class: "error-message" }, ["Failed to load jobs."])
    );
  }
}
