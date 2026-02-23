import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { renderPost } from "./renders/renderPost.js";
import { fetchBulkPostMetadata } from "./renders/bulkMeta.js";

export async function fetchFeed(container) {
    try {
        const posts = await loadFeedData();
        if (!posts.length) {
            container.appendChild(createElement("p", {}, ["No posts available."]));
            return;
        }

        const postIds = posts.map(p => p.postid);

        // Fetch metadata in bulk, returned as map keyed by postId
        const postmetadata = await fetchBulkPostMetadata(postIds);

        // Render all posts with metadata
        await renderPost(posts, container, postmetadata, 0);

    } catch (err) {
        console.error("Feed error:", err);
        container.appendChild(createElement("p", {}, ["Error loading posts."]));
    }
}

async function loadFeedData() {
    const response = await apiFetch("/feed/feed");
    if (!response.ok || !Array.isArray(response.data)) {
        throw new Error("Invalid feed response");
    }
    return response.data;
}
