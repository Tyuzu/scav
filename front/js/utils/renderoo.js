
export function renderError(container, error) {
    let message = "Something went wrong.";
    if (error.message?.includes("Network")) {
      message = "Network error. Check your connection.";
    } else if (error.response?.status === 500) {
      message = "Server error. Try again later.";
    }
    container.innerHTML = `<div class="error" role="alert">${message}</div>`;
  }