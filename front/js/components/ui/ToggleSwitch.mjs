import "../../../css/ui/ToggleSwitch.css";

const ToggleSwitch = (onToggle, { checked = false, id = "", label = "" } = {}) => {
  const toggle = document.createElement("label");
  toggle.className = "toggle-switch";
  if (id) toggle.setAttribute("for", id);

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  if (id) input.id = id;
  input.setAttribute("aria-label", label || "Toggle");

  input.addEventListener("change", () => onToggle(input.checked));

  const slider = document.createElement("span");
  slider.className = "slider";

  toggle.appendChild(input);
  toggle.appendChild(slider);

  return toggle;
};

  export default ToggleSwitch;
  
