import { createElement } from "../../../components/createElement.js";
import { createFormGroup } from "../../../components/createFormGroup.js";

export function createInputField(type, placeholder, value = "", required = false) {
  return createElement("input", {
    type,
    placeholder,
    value,
    required,
  });
}

export function createForm(fields, onSubmit, submitText = "Submit") {
  const form = createElement("form", { class: "create-section" });
  form.appendChild(createElement("h2", {}, ["Create Farm"]));
  fields.forEach(field => form.appendChild(field));
  const submitBtn = createElement("button", { type: "submit" }, [submitText]);
  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await onSubmit(form);
    if (result === true || result?.success) {
      form.reset();
      // const preview = form.querySelector("img.preview");
      // if (preview) preview.style.display = "none";
    }
  });

  return form;
}

export function createFarmForm({ isEdit = false, farm = {}, onSubmit }) {
  const fieldsConfig = [
    { type: "text", id: "farm-name", label: "Name", value: farm.name || "", placeholder: "Farm Name", required: true },
    { type: "text", id: "farm-location", label: "Location", value: farm.location || "", placeholder: "Location", required: true },
    { type: "textarea", id: "farm-description", label: "Description", value: farm.description || "", placeholder: "Description", required: false, rows: 3 },
    { type: "text", id: "farm-owner", label: "Owner", value: farm.owner || "", placeholder: "Owner", required: true },
    { type: "text", id: "farm-contact", label: "Contact", value: farm.contact || "", placeholder: "Contact", required: true },
    {
      type: "select", id: "farm-practice", label: "Farming Practice", value: farm.practice || "", options: [
        { value: "organic", label: "Organic" },
        { value: "conventional", label: "Conventional" },
        { value: "hydroponic", label: "Hydroponic" },
        { value: "regenerative", label: "Regenerative" },
      ]
    },
    { type: "text", id: "farm-availability", label: "Availability", value: farm.availabilityTiming || "", placeholder: "Availability (e.g. Mon-Fri, 9am-5pm)" },
    { type: "url", id: "farm-social", label: "Social Link", value: farm.social || "", placeholder: "Website / Social Link" },
    // { type: "file", id: "farm-gallery", label: "Gallery", attributes: { accept: "image/*", multiple: true } }
  ];

  const fields = fieldsConfig.map(f => createFormGroup(f));

  const form = createForm(fields, async () => {
    const formData = new FormData();
    fieldsConfig.forEach(f => {
      const input = document.getElementById(f.id);
      if (!input) return;
      // if (f.type === "file" && input.files.length > 0) {
      //   Array.from(input.files).forEach(file => formData.append("gallery", file));
      // } else {
      formData.append(f.id.replace("farm-", ""), input.value.trim());
      // }
    });

    if (!isEdit) formData.append("crops", JSON.stringify([]));

    return await onSubmit(formData);
  }, isEdit ? "Update Farm" : "Create Farm");

  return form;
}
