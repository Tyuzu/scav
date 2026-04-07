import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import Button from "../../components/base/Button.js";

function handleAddReview(container, entityType, entityId, onDone) {
    container.replaceChildren();

    const form = createElement("form", { class: "review-form" });

    const ratingGroup = createFormGroup({
        type: "number",
        id: "rating",
        label: "Rating (1–5)",
        required: true,
        additionalProps: { min: 1, max: 5 }
    });

    const commentGroup = createFormGroup({
        type: "textarea",
        id: "comment",
        label: "Your review",
        required: true,
        additionalProps: { rows: 3 }
    });

    const submitBtn = Button("Submit", "", { type: "submit" });
    const cancelBtn = Button("Cancel", "", {
        click: () => container.replaceChildren()
    });

    form.append(ratingGroup, commentGroup, submitBtn, cancelBtn);
    container.append(form);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const rating = Number(form.querySelector("#rating").value);
        const comment = form.querySelector("#comment").value.trim();

        if (rating < 1 || rating > 5 || !comment) {
            alert("Invalid rating or empty comment.");
            return;
        }

        try {
            await apiFetch(`/reviews/${entityType}/${entityId}`, "POST", {
                rating,
                comment
            });
            container.replaceChildren();
            onDone();
        } catch (err) {
            alert(err?.error || "You already reviewed this item.");
        }
    });
}

function handleEditReview(review, entityType, entityId, onDone) {
    const container = review.__container;
    container.replaceChildren();

    const form = createElement("form", { class: "review-form" });

    const ratingGroup = createFormGroup({
        type: "number",
        id: "rating",
        label: "Rating (1–5)",
        required: true,
        value: review.rating,
        additionalProps: { min: 1, max: 5 }
    });

    const commentGroup = createFormGroup({
        type: "textarea",
        id: "comment",
        label: "Your review",
        required: true,
        value: review.comment,
        additionalProps: { rows: 3 }
    });

    const submitBtn = Button("Save", "", { type: "submit" });
    const cancelBtn = Button("Cancel", "", { click: onDone });

    form.append(ratingGroup, commentGroup, submitBtn, cancelBtn);
    container.append(form);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const rating = Number(form.querySelector("#rating").value);
        const comment = form.querySelector("#comment").value.trim();

        if (rating < 1 || rating > 5 || !comment) {
            alert("Invalid input.");
            return;
        }

        await apiFetch(
            `/reviews/${entityType}/${entityId}/${review.reviewid}`,
            "PUT",
            { rating, comment }
        );

        onDone();
    });
}

async function handleDeleteReview(reviewId, entityType, entityId, onDone) {
    if (!confirm("Delete this review?")) {
return;
}

    await apiFetch(`/reviews/${entityType}/${entityId}/${reviewId}`, "DELETE");
    onDone();
}

export { handleAddReview, handleEditReview, handleDeleteReview };

