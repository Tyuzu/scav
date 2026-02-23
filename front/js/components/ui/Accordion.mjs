import "../../../css/ui/Accordion.css";

const Accordion = (sections = []) => {
  const container = document.createElement("div");
  container.className = "accordion";

  sections.forEach(({ title, content, open = false }) => {
    const details = document.createElement("details");
    details.className = "accordion-section";
    if (open) details.open = true;

    const summary = document.createElement("summary");
    summary.className = "accordion-header";
    summary.textContent = title;

    const abody = document.createElement("div");
    abody.className = "accordion-body";

    if (typeof content === "string") {
      abody.textContent = content; // safer than innerHTML
    } else if (content instanceof HTMLElement) {
      abody.appendChild(content);
    }

    details.appendChild(summary);
    details.appendChild(abody);
    container.appendChild(details);
  });

  return container;
};

export default Accordion;
export { Accordion };
