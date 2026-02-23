import "../../../css/ui/Tooltip.css";

const Tooltip = (text, { trigger = "?", position = "top" } = {}) => {
  const tooltip = document.createElement("span");
  tooltip.className = `tooltip tooltip-${position}`;
  tooltip.textContent = text;

  const wrapper = document.createElement("div");
  wrapper.className = "tooltip-wrapper";
  wrapper.setAttribute("tabindex", "0");
  wrapper.setAttribute("role", "tooltip");
  wrapper.textContent = trigger;
  wrapper.appendChild(tooltip);

  return wrapper;
};

  export default Tooltip;
  
