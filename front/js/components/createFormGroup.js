import { createElement } from "./createElement.js";

export function createFormGroup({
  type = "text",
  id = "",
  name = "",
  label = "",
  value = "",
  placeholder = "",
  required = false,
  accept = "",
  options = [],
  multiple = false,
  additionalProps = {},
  additionalNodes = []
}) {
  const group = createElement("div", { class: "form-group" });

  if (label) {
    const labelAttrs = {};
    if (id) labelAttrs.for = id;
    const labelElement = createElement("label", labelAttrs, [label]);
    group.appendChild(labelElement);
  }

  const inputName = name || id || "";
  let inputElement;

  switch (type) {
    case "textarea":
      inputElement = createElement("textarea", {
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || undefined
      });
      if (value !== undefined && value !== null) inputElement.value = String(value);
      break;

    case "select":
    case "multiselect":
      inputElement = createElement("select", { id: id || undefined, name: inputName || undefined });
      if (type === "multiselect" || multiple) inputElement.multiple = true;

      if (placeholder) {
        const placeholderOption = createElement("option", { value: "", disabled: true, selected: !value }, [placeholder]);
        inputElement.appendChild(placeholderOption);
      }

      options.forEach(opt => {
        const { value: optValue, label: optLabel } =
          typeof opt === "string" ? { value: opt, label: opt } : opt;

        const optionAttrs = { value: optValue };
        if (optValue === "" && !placeholder) optionAttrs.disabled = true;

        const option = createElement("option", optionAttrs, [optLabel]);

        const valueLower = Array.isArray(value)
          ? value.map(v => String(v).toLowerCase())
          : String(value).toLowerCase();

        if (
          (Array.isArray(value) && valueLower.includes(String(optValue).toLowerCase())) ||
          (!Array.isArray(value) && String(optValue).toLowerCase() === String(value).toLowerCase())
        ) {
          option.selected = true;
        }

        inputElement.appendChild(option);
      });
      break;

    case "number":
      inputElement = createElement("input", {
        type: "number",
        id: id || "",
        name: inputName || "",
        placeholder: placeholder || "",
        value: (value != null && value !== "") ? Number(value) : ""
      });
      break;

    case "file":
      inputElement = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        accept: accept || undefined
      });
      if (multiple) inputElement.multiple = true;
      break;

    default:
      inputElement = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || undefined,
        value: (value != null) ? String(value) : ""
      });
      if (accept) inputElement.accept = accept;
      if (type === "file" && multiple) inputElement.multiple = true;
      break;
  }

  if (required) inputElement.required = true;

  Object.entries(additionalProps).forEach(([key, val]) => {
    try {
      if (key in inputElement) inputElement[key] = val;
      else inputElement.setAttribute(key, String(val));
    } catch {
      inputElement.setAttribute(key, String(val));
    }
  });

  group.appendChild(inputElement);

  // Append any additional nodes like character counters
  if (Array.isArray(additionalNodes)) additionalNodes.forEach(node => group.appendChild(node));

  return group;
}
