import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Imagex from "../../components/base/Imagex.js";

const stl = createElement('style');
stl.innerHTML= `.user-profile-container {
    padding: 16px;
    font-family: sans-serif;
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
}

.grid-item {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background-color: #eee;
}
`;

// Fetch user profile data for a specific entity type
async function fetchUserProfileData(username, entityType) {
    try {
        const response = await apiFetch(`/user/${username}/udata?entity_type=${entityType}`);
        return response; // assume JSON array of post objects
    } catch (error) {
        console.error(`Error fetching ${entityType} data for user:`, error);
        throw error;
    }
}

// Renders posts in a 3-column grid (optionally slice to 9 items for a 3×3 block)
export async function othusrdata(kc, userid) {
    kc.appendChild(stl);
    const container = createElement("div", { class: "user-profile-container" });

    // Header with the username
    // const header = createElement("h2", {}, [userid]);
    // container.appendChild(header);

    const grid = createElement("div", { class: "grid-container" });

    try {
        const posts = await fetchUserProfileData(userid, "feedpost");
        // If you want strictly 9 posts, uncomment the next line:
        // const displayPosts = posts.slice(0, 9);
        const displayPosts = posts; // or use slice(0, 9)

        displayPosts.forEach((post) => {
            const postBox = createElement("div", { class: "grid-item" });

            // Replace "image_url" with whatever key your backend actually sends
            const img = Imagex({
                src: post.image_url,
                alt: post.caption || "Post image",
                style: "width:100%; height:100%; object-fit:cover;",
            });

            postBox.appendChild(img);
            grid.appendChild(postBox);
        });

        container.appendChild(grid);
    } catch (error) {
        const errorMessage = createElement("p", {}, [`Error: ${error.message}`]);
        container.appendChild(errorMessage);
    }

    kc.appendChild(container);
}

