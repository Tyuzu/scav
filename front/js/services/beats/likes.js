import { apiFetch } from "../../api/api.js";


// Toggle like: POST /likes/:entitytype/like/:entityid
export async function toggleLike(entityType, entityId) {
    try {
        const path = `/likes/${entityType}/like/${entityId}`;
        const response = await apiFetch(path, "POST");

        // Expecting: { liked: boolean, count: number }
        if (response && typeof response.liked === "boolean" && typeof response.count === "number") {
            return response;
        }

        return { liked: false, count: 0 };
    } catch (err) {
        console.error("toggleLike error:", err);
        return { liked: false, count: 0 };
    }
}