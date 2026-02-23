

function createImageField(label, id, currentSrc, previewId) {
    const imageGroup = document.createElement("div");
    imageGroup.classList.add("image-group");

    const labelElement = document.createElement("p");
    labelElement.textContent = `Current ${label}:`;

    const currentImg = document.createElement("img");
    currentImg.id = `current-${id}`;
    currentImg.src = currentSrc;
    currentImg.loading = "lazy";
    currentImg.style.maxWidth = "200px";
    if (!currentSrc) currentImg.style.display = "none";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = id;
    fileInput.accept = "image/*";
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const preview = document.getElementById(previewId);
                preview.src = reader.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    const previewImg = document.createElement("img");
    previewImg.id = previewId;
    previewImg.loading = "lazy";
    previewImg.style.display = "none";
    previewImg.style.maxWidth = "200px";

    imageGroup.appendChild(labelElement);
    imageGroup.appendChild(currentImg);
    imageGroup.appendChild(fileInput);
    imageGroup.appendChild(previewImg);

    return imageGroup;
}

function createForm(content, fields, formId, buttonId, buttonText, onSubmit) {
    const form = document.createElement("form");
    form.id = formId;

    fields.forEach(field => {
        const imageField = createImageField(field.label, field.id, field.currentSrc, field.previewId);
        form.appendChild(imageField);
    });

    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.id = buttonId;
    submitButton.textContent = buttonText;
    submitButton.addEventListener("click", onSubmit);

    form.appendChild(submitButton);
    content.appendChild(form);
    return content;
}

export { createForm };