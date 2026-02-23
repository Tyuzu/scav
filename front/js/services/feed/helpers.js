// postCreation/helpers.js

export function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute("content") : "";
  }
  
  export function removeFileFromInput(inputElement, fileToRemove) {
    const dt = new DataTransfer();
    Array.from(inputElement.files)
      .filter((file) => file !== fileToRemove)
      .forEach((file) => dt.items.add(file));
    inputElement.files = dt.files;
  }
  