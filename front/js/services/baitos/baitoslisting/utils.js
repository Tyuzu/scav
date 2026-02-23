export const categoryMap = {
  Food: ["Waiter", "Cook", "Delivery", "Cleaning"],
  Health: ["Reception", "Cleaner", "Helper"],
  Retail: ["Cashier", "Stock", "Floor Staff"],
  Hospitality: ["Housekeeping", "Front Desk", "Server"],
  Other: ["Manual Labor", "Seasonal Work", "Event Help"]
};

export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function saveJob(id) {
  const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");
  if (!saved.includes(id)) {
    saved.push(id);
    localStorage.setItem("savedJobs", JSON.stringify(saved));
  }
}
