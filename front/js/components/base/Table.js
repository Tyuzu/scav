import "../../../css/ui/Table.css";

// Table component with enhanced functionality
const Table = (
  headers = [], // Array of header names
  data = [], // Array of rows (each row is an array of cell values)
  id = "", // ID for the table
  classes = "", // Custom classes
  styles = {}, // Inline styles
  events = {} // Custom event listeners
) => {
  // Input validation
  if (!Array.isArray(headers) || !Array.isArray(data)) {
    throw new Error("'headers' and 'data' must be arrays.");
  }

  // Create the table element
  const table = document.createElement("table");
  table.id = id;

  // Apply inline styles dynamically
  for (const [key, value] of Object.entries(styles)) {
    table.style[key] = value;
  }

  // Add classes dynamically
  if (classes) {
    table.classList.add(...classes.split(" "));
  }

  // Add default class
  table.classList.add("table");

  // Create the table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create the table body
  const tbody = document.createElement("tbody");

  data.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  // Attach custom event listeners
  for (const [event, handler] of Object.entries(events)) {
    if (typeof handler === "function") {
      table.addEventListener(event, handler);
    }
  }

  return table;
};

export default Table;
export { Table };
