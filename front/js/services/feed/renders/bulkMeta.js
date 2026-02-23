import { apiFetch } from "../../../api/api.js";

/**
 * Fetch metadata for multiple posts in bulk.
 * Returns an object keyed by postId for fast lookup.
 */
export async function fetchBulkPostMetadata(postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) return {};

    try {
        const response = await apiFetch("/feed/feed/metadata", "POST", { ids: postIds });
        const data = Array.isArray(response) ? response : response.data || [];

        const metadataMap = {};
        for (const item of data) {
            metadataMap[item.postId] = item;
        }

        return metadataMap;
    } catch (err) {
        console.error("Failed to fetch post metadata", err);
        return {};
    }
}
