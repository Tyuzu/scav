import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { SRC_URL, apiFetch } from "../../api/api.js";

// ─── Helpers (same as Part 1) ──────────────────────────────────────────────────

export function showLoading(container) {
  container.appendChild(
    createElement("div", { class: "loading" }, [
      createElement("p", {}, ["Loading…"])
    ])
  );
}

export function showError(container, message) {
  container.appendChild(
    createElement("div", { class: "tab-section error" }, [
      createElement("p", {}, [message])
    ])
  );
  console.warn(message);
}

function createInlineForm(fields, onSubmit, onCancel) {
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

// ─── Exhibits (Museum) ─────────────────────────────────────────────────────────

async function displayPlaceExhibits(container, placeId, isCreator) {
  container.replaceChildren();
  showLoading(container);

  try {
    const exhibits = await apiFetch(`/place/${placeId}/exhibits`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Exhibits"]));
    const exhibitSection = createElement("div", { class: "exhibit-section" }, []);

    exhibits.forEach((ex) => {
      const exDiv = createElement("div", { class: "exhibit-item" }, [
        createElement("h4", {}, [ex.title]),
        createElement("p", {}, [ex.desc])
      ]);

      if (isCreator) {
        const editBtn = Button("Edit", `edit-exhibit-${ex._id}`, {
          click: () => {
            const formFields = [
              { name: "title", placeholder: "Title", value: ex.title },
              { name: "desc", placeholder: "Description", value: ex.desc }
            ];
            const editForm = createInlineForm(
              formFields,
              async (data, formEl) => {
                try {
                  await apiFetch(`/place/${placeId}/exhibits/${ex._id}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                  });
                  displayPlaceExhibits(container, placeId, isCreator);
                } catch (e) {
                  alert(`Update failed: ${e.message}`);
                }
              },
              (formEl) => exDiv.replaceChild(exDivClone, formEl)
            );
            const exDivClone = exDiv.cloneNode(true);
            exDiv.replaceChildren(editForm);
          }
        });
        const deleteBtn = Button("Delete", `delete-exhibit-${ex._id}`, {
          click: async () => {
            if (!confirm(`Delete exhibit "${ex.title}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/exhibits/${ex._id}`, {
                method: "DELETE"
              });
              displayPlaceExhibits(container, placeId, isCreator);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        exDiv.appendChild(editBtn);
        exDiv.appendChild(deleteBtn);
      }

      exhibitSection.appendChild(exDiv);
    });

    container.appendChild(exhibitSection);

    if (isCreator) {
      const addBtn = Button("Add Exhibit", "add-exhibit", {
        click: () => {
          const formFields = [
            { name: "title", placeholder: "Title" },
            { name: "desc", placeholder: "Description" }
          ];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/exhibits`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceExhibits(container, placeId, isCreator);
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
    showError(container, "Exhibits unavailable.");
  }
}

// ─── Membership (Gym) ─────────────────────────────────────────────────────────

async function displayPlaceMembership(container, placeId, isCreator, isLoggedIn) {
  container.replaceChildren();
  showLoading(container);

  try {
    const plans = await apiFetch(`/place/${placeId}/membership`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Membership Plans"]));
    const planSection = createElement("div", { class: "membership-section" }, []);

    plans.forEach((plan) => {
      const planDiv = createElement("div", { class: "plan-item" }, [
        createElement("h4", {}, [plan.name]),
        createElement("p", {}, [`Price: ${plan.price}`])
      ]);

      if (isLoggedIn) {
        const joinBtn = Button("Join", `join-${plan._id}`, {
          click: () => {
            apiFetch(`/place/${placeId}/membership/${plan._id}/join`, {
              method: "POST"
            })
              .then(() => alert(`Joined ${plan.name} plan`))
              .catch((e) => alert(`Join failed: ${e.message}`));
          }
        });
        planDiv.appendChild(joinBtn);
      }

      if (isCreator) {
        const editBtn = Button("Edit", `edit-plan-${plan._id}`, {
          click: () => {
            const formFields = [
              { name: "name", placeholder: "Name", value: plan.name },
              { name: "price", placeholder: "Price", value: plan.price }
            ];
            const editForm = createInlineForm(
              formFields,
              async (data, formEl) => {
                try {
                  await apiFetch(`/place/${placeId}/membership/${plan._id}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                  });
                  displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
                } catch (e) {
                  alert(`Update failed: ${e.message}`);
                }
              },
              (formEl) => planDiv.replaceChild(planDivClone, formEl)
            );
            const planDivClone = planDiv.cloneNode(true);
            planDiv.replaceChildren(editForm);
          }
        });
        const deleteBtn = Button("Delete", `delete-plan-${plan._id}`, {
          click: async () => {
            if (!confirm(`Delete plan "${plan.name}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/membership/${plan._id}`, {
                method: "DELETE"
              });
              displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        planDiv.appendChild(editBtn);
        planDiv.appendChild(deleteBtn);
      }

      planSection.appendChild(planDiv);
    });

    container.appendChild(planSection);

    if (isCreator) {
      const addBtn = Button("Add Plan", "add-plan", {
        click: () => {
          const formFields = [
            { name: "name", placeholder: "Name" },
            { name: "price", placeholder: "Price" }
          ];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/membership`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceMembership(container, placeId, isCreator, isLoggedIn);
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
    showError(container, "Membership data unavailable.");
  }
}

// ─── Shows (Theater) ───────────────────────────────────────────────────────────

async function displayPlaceShows(container, placeId, isCreator, isLoggedIn) {
  container.replaceChildren();
  showLoading(container);

  try {
    const shows = await apiFetch(`/place/${placeId}/shows`);
    container.replaceChildren();

    container.appendChild(createElement("h3", {}, ["Upcoming Shows"]));
    const showSection = createElement("div", { class: "show-section" }, []);

    shows.forEach((show) => {
      const showDiv = createElement("div", { class: "show-item" }, [
        createElement("h4", {}, [show.title]),
        createElement("p", {}, [`Date: ${show.date}`]),
        createElement("p", {}, [`Time: ${show.time}`])
      ]);

      if (isLoggedIn) {
        const bookBtn = Button("Book Seat", `book-${show._id}`, {
          click: () => {
            apiFetch(`/place/${placeId}/shows/${show._id}/book`, {
              method: "POST"
            })
              .then(() => alert(`Booked seat for ${show.title}`))
              .catch((e) => alert(`Booking failed: ${e.message}`));
          }
        });
        showDiv.appendChild(bookBtn);
      }

      if (isCreator) {
        const editBtn = Button("Edit", `edit-show-${show._id}`, {
          click: () => {
            const formFields = [
              { name: "title", placeholder: "Title", value: show.title },
              { name: "date", placeholder: "Date", type: "date", value: show.date },
              { name: "time", placeholder: "Time", value: show.time }
            ];
            const editForm = createInlineForm(
              formFields,
              async (data, formEl) => {
                try {
                  await apiFetch(`/place/${placeId}/shows/${show._id}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                  });
                  displayPlaceShows(container, placeId, isCreator, isLoggedIn);
                } catch (e) {
                  alert(`Update failed: ${e.message}`);
                }
              },
              (formEl) => showDiv.replaceChild(showDivClone, formEl)
            );
            const showDivClone = showDiv.cloneNode(true);
            showDiv.replaceChildren(editForm);
          }
        });
        const deleteBtn = Button("Delete", `delete-show-${show._id}`, {
          click: async () => {
            if (!confirm(`Delete show "${show.title}"?`)) return;
            try {
              await apiFetch(`/place/${placeId}/shows/${show._id}`, {
                method: "DELETE"
              });
              displayPlaceShows(container, placeId, isCreator, isLoggedIn);
            } catch (e) {
              alert(`Delete failed: ${e.message}`);
            }
          }
        });
        showDiv.appendChild(editBtn);
        showDiv.appendChild(deleteBtn);
      }

      showSection.appendChild(showDiv);
    });

    container.appendChild(showSection);

    if (isCreator) {
      const addBtn = Button("Add Show", "add-show", {
        click: () => {
          const formFields = [
            { name: "title", placeholder: "Title" },
            { name: "date", placeholder: "Date", type: "date" },
            { name: "time", placeholder: "Time" }
          ];
          const addForm = createInlineForm(
            formFields,
            async (data, formEl) => {
              try {
                await apiFetch(`/place/${placeId}/shows`, {
                  method: "POST",
                  body: JSON.stringify(data)
                });
                displayPlaceShows(container, placeId, isCreator, isLoggedIn);
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
    showError(container, "Shows unavailable.");
  }
}


// ─── Fallback (Unknown Category) ───────────────────────────────────────────────

async function displayPlaceDetailsFallback(container, categoryRaw, placeId) {
  container.replaceChildren();

  container.appendChild(
    createElement("div", { class: "fallback-message" }, [
      createElement("p", {}, [`No special section for "${categoryRaw}".`])
    ])
  );
}

export {
  displayPlaceExhibits,
  displayPlaceMembership,
  displayPlaceShows,
  displayPlaceDetailsFallback
};
