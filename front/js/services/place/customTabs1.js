import { createElement } from "../../components/createElement.js";
import BookingForm from "../../components/ui/BookingForm.mjs";
import Button from "../../components/base/Button.js";
import { apiFetch } from "../../api/api.js";
import { displayMenu } from "../menu/menuService.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Show a simple loading spinner / message
function showLoading(container) {
  container.appendChild(
    createElement("div", { class: "loading" }, [
      createElement("p", {}, ["Loading…"])
    ])
  );
}

// Show an error message
function showError(container, message) {
  container.appendChild(
    createElement("div", { class: "tab-section error" }, [
      createElement("p", {}, [message])
    ])
  );
  console.warn(message);
}

// Create a generic inline form builder
function createInlineForm(fields, onSubmit, onCancel) {
  // fields: [{ name: "fieldName", placeholder: "Label", type: "text", value: "" }, …]
  const form = createElement("form", { class: "inline-form" }, []);

  fields.forEach((f) => {
    const label = createElement("label", { for: f.name }, [f.placeholder]);
    const input = createElement("input", {
      type: f.type || "text",
      name: f.name,
      id: f.name,
      value: f.value || ""
    });
    form.appendChild(label);
    form.appendChild(input);
  });

  const submitBtn = Button("Submit", "form-submit", {
    click: (e) => {
      e.preventDefault();
      const data = {};
      fields.forEach((f) => {
        data[f.name] = form.querySelector(`[name="${f.name}"]`).value;
      });
      onSubmit(data, form);
    }
  });

  const cancelBtn = Button("Cancel", "form-cancel", {
    click: (e) => {
      e.preventDefault();
      onCancel(form);
    }
  });

  const btnContainer = createElement("div", { class: "form-buttons" }, [
    submitBtn,
    cancelBtn
  ]);

  form.appendChild(btnContainer);
  return form;
}


// 🍽️ Restaurant / Café → Menu
async function displayPlaceMenu(container, placeId, isCreator, isLoggedIn) {
  container.replaceChildren();
  try {
    let containerx = createElement('div', {}, []);
    container.appendChild(containerx);
    // RenderMenu(containerx, isCreator, placeId, isLoggedIn);
    displayMenu(containerx, placeId, isCreator, isLoggedIn);
  } catch (err) {
    container.appendChild(
      createElement("div", { class: "tab-section error" }, [
        createElement("p", {}, ["Menu unavailable."]),
      ])
    );
    console.warn("Menu tab failed:", err);
  }
}

// 🍽️ Saloon
async function displaySaloonSlots(container, placeId, isCreator, isLoggedIn) {
  container.replaceChildren();
  try {
    container.appendChild(
      BookingForm(alert("hi")));
  } catch (err) {
    container.appendChild(
      createElement("div", { class: "tab-section error" }, [
        createElement("p", {}, ["Slot unavailable."]),
      ])
    );
    console.warn("Menu tab failed:", err);
  }
}

// ─── Rooms (Hotel) ──────────────────────────────────────────────────────────────

async function displayPlaceRooms(container, placeId, isCreator) {
  container.replaceChildren();
  showLoading(container);

  try {
    const rooms = await apiFetch(`/place/${placeId}/rooms`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Available Rooms"]));
    const roomSection = createElement("div", { class: "room-section vflex" }, []);

    rooms.forEach((room) => {
      const roomDiv = createElement("div", { class: "room-item" }, [
        createElement("h4", {}, [room.name]),
        createElement("p", {}, [`Capacity: ${room.capacity}`]),
        createElement("p", {}, [`Price: ${room.price}`])
      ]);

      const bookBtn = Button("Book Now", `book-${room._id}`, {
        click: () => {
          // Example: open booking form or direct API call
          const dateField = createElement("input", {
            type: "date",
            name: "bookingDate"
          });
          const submitField = Button("Submit Booking", `submit-book-${room._id}`, {
            click: async () => {
              const bookingDate = dateField.value;
              if (!bookingDate) {
                alert("Choose a date");
                return;
              }
              try {
                await apiFetch(`/place/${placeId}/rooms/${room._id}/book`, {
                  method: "POST",
                  body: JSON.stringify({ date: bookingDate })
                });
                alert(`Booked ${room.name} on ${bookingDate}`);
              } catch (e) {
                alert(`Booking failed: ${e.message}`);
              }
            }
          });
          roomDiv.appendChild(dateField);
          roomDiv.appendChild(submitField);
        }
      });
      roomDiv.appendChild(bookBtn);

      if (isCreator) {
        const editBtn = Button("Edit", `edit-room-${room._id}`, {
          click: () => {
            const formFields = [
              { name: "name", placeholder: "Name", value: room.name },
              { name: "capacity", placeholder: "Capacity", value: room.capacity },
              { name: "price", placeholder: "Price", value: room.price }
            ];
            const editForm = createInlineForm(
              formFields,
              async (data, formEl) => {
                try {
                  await apiFetch(`/place/${placeId}/rooms/${room._id}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                  });
                  displayPlaceRooms(container, placeId, isCreator);
                } catch (e) {
                  alert(`Update failed: ${e.message}`);
                }
              },
              (formEl) => roomDiv.replaceChild(roomDivClone, formEl)
            );
            const roomDivClone = roomDiv.cloneNode(true);
            roomDiv.replaceChildren(editForm);
          }
        });
        const deleteBtn = Button("Delete", `delete-room-${room._id}`, {
          click: async () => {
            if (!confirm(`Delete room "${room.name}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/rooms/${room._id}`, {
                method: "DELETE"
              });
              displayPlaceRooms(container, placeId, isCreator);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        roomDiv.appendChild(editBtn);
        roomDiv.appendChild(deleteBtn);
      }

      roomSection.appendChild(roomDiv);
    });

    container.appendChild(roomSection);

    if (isCreator) {
      const addBtn = Button("Add New Room", "add-room-item", {
        click: () => {
          const formFields = [
            { name: "name", placeholder: "Name" },
            { name: "capacity", placeholder: "Capacity", type: "number" },
            { name: "price", placeholder: "Price" }
          ];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/rooms`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceRooms(container, placeId, isCreator);
              } catch (e) {
                alert(`Creation failed: ${e.message}`);
              }
            },
            (formEl) => container.removeChild(formEl)
          );
          container.appendChild(addForm);
          addBtn.disabled = true;
        }
      });
      container.appendChild(addBtn);
    }
  } catch (err) {
    container.replaceChildren();
    showError(container, "Rooms unavailable.");
  }
}

// ─── Facilities (Park) ─────────────────────────────────────────────────────────

async function displayPlaceFacilities(container, placeId, isCreator) {
  container.replaceChildren();
  showLoading(container);

  try {
    // Assume backend returns array of facility strings or objects
    const facilities = await apiFetch(`/place/${placeId}/facilities`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Park Facilities"]));
    const ul = createElement("ul", { class: "facility-list" }, []);

    facilities.forEach((f) => {
      // If backend returns object { _id, name }
      const name = typeof f === "string" ? f : f.name;
      const id = f._id || name;

      const li = createElement("li", {}, [name]);

      if (isCreator) {
        const deleteBtn = Button("Delete", `delete-facility-${id}`, {
          click: async () => {
            if (!confirm(`Delete facility "${name}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/facilities/${id}`, {
                method: "DELETE"
              });
              displayPlaceFacilities(container, placeId, isCreator);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        li.appendChild(deleteBtn);
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);

    if (isCreator) {
      const addBtn = Button("Add Facility", "add-facility", {
        click: () => {
          const formFields = [
            { name: "name", placeholder: "Facility Name" }
          ];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/facilities`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceFacilities(container, placeId, isCreator);
              } catch (e) {
                alert(`Creation failed: ${e.message}`);
              }
            },
            (formEl) => container.removeChild(formEl)
          );
          container.appendChild(addForm);
          addBtn.disabled = true;
        }
      });
      container.appendChild(addBtn);
    }
  } catch (err) {
    container.replaceChildren();
    showError(container, "Facilities unavailable.");
  }
}

// ─── Services (Business) ───────────────────────────────────────────────────────

async function displayPlaceServices(container, placeId, isCreator) {
  container.replaceChildren();
  showLoading(container);

  try {
    const services = await apiFetch(`/place/${placeId}/services`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Business Services"]));
    const ul = createElement("ul", { class: "service-list" }, []);

    services.forEach((s) => {
      const name = s.name;
      const id = s._id;

      const li = createElement("li", {}, [name]);

      if (isCreator) {
        const editBtn = Button("Edit", `edit-service-${id}`, {
          click: () => {
            const formFields = [{ name: "name", placeholder: "Name", value: name }];
            const editForm = createInlineForm(
              formFields,
              async (data, formEl) => {
                try {
                  await apiFetch(`/place/${placeId}/services/${id}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                  });
                  displayPlaceServices(container, placeId, isCreator);
                } catch (e) {
                  alert(`Update failed: ${e.message}`);
                }
              },
              (formEl) => li.replaceChild(liClone, formEl)
            );
            const liClone = li.cloneNode(true);
            li.replaceChildren(editForm);
          }
        });
        const deleteBtn = Button("Delete", `delete-service-${id}`, {
          click: async () => {
            if (!confirm(`Delete service "${name}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/services/${id}`, {
                method: "DELETE"
              });
              displayPlaceServices(container, placeId, isCreator);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);

    if (isCreator) {
      const addBtn = Button("Add Service", "add-service", {
        click: () => {
          const formFields = [{ name: "name", placeholder: "Service Name" }];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/services`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceServices(container, placeId, isCreator);
              } catch (e) {
                alert(`Creation failed: ${e.message}`);
              }
            },
            (formEl) => container.removeChild(formEl)
          );
          container.appendChild(addForm);
          addBtn.disabled = true;
        }
      });
      container.appendChild(addBtn);
    }
  } catch (err) {
    container.replaceChildren();
    showError(container, "Services unavailable.");
  }
}

export {
  displayPlaceMenu,
  displayPlaceRooms,
  displayPlaceFacilities,
  displayPlaceServices,
  displaySaloonSlots
};
