// src/ui/components/createFileInputGroup.js
import { createElement } from "./createElement.js";

export function createFileInputGroup({ label, inputId, isRequired = false }) {
  const labelEl = createElement("label", {}, [
    createElement("span", {}, [label]),
    createElement("input", {
      id: inputId,
      name: inputId,
      type: "file",
      multiple: true,
      required: isRequired
    })
  ]);

  return labelEl;
}
