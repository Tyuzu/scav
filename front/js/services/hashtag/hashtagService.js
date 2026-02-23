import { createElement } from "../../components/createElement.js";
import { reportPost } from "../reporting/reporting.js";
import { apiFetch } from "../../api/api.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createTabs } from "../../components/ui/createTabs.js";
import Imagex from "../../components/base/Imagex.js";

// --- Helpers ---
const DEFAULT_LIMIT = 20;

// Render "Top" tab
async function renderTopTab(container, hashtag, page = 0, limit = DEFAULT_LIMIT) {
    const loading = createElement("p", { class: "loading" }, ["Loading top posts..."]);
    container.appendChild(loading);

    try {
        const posts = await apiFetch(`/hashtags/hashtag/${hashtag}/top?page=${page}&limit=${limit}`);
        container.textContent = "";

        if (!posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No top posts found for this hashtag."])
                ])
            );
            return;
        }

        posts.forEach(post => {
            const item = createElement("div", { class: "post-item" }, [
                createElement("a", { href: `/feedpost/${post.postid}` }, [post.title || "View post"])
            ]);
            container.appendChild(item);
        });
    } catch (err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load top posts."])
            ])
        );
    }
}

// Render "Latest" tab
async function renderLatestTab(container, hashtag, page = 0, limit = DEFAULT_LIMIT) {
    const loading = createElement("p", { class: "loading" }, ["Loading latest posts..."]);
    container.appendChild(loading);

    try {
        const posts = await apiFetch(`/hashtags/hashtag/${hashtag}/latest?page=${page}&limit=${limit}`);
        container.textContent = "";

        if (!posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No recent posts found for this hashtag."])
                ])
            );
            return;
        }

        posts.forEach(post => {
            const item = createElement("div", { class: "post-item" }, [
                createElement("a", { href: `/feedpost/${post.postid}` }, [post.title || "View post"])
            ]);
            container.appendChild(item);
        });
    } catch (err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load latest posts."])
            ])
        );
    }
}

// Render "People" tab
async function renderPeopleTab(container, hashtag, page = 0, limit = DEFAULT_LIMIT) {
    const loading = createElement("p", { class: "loading" }, ["Loading people..."]);
    container.appendChild(loading);

    try {
        const people = await apiFetch(`/hashtags/hashtag/${hashtag}/people?page=${page}&limit=${limit}`);
        container.textContent = "";

        if (!people.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No people found using this hashtag."])
                ])
            );
            return;
        }

        people.forEach(user => {
            const item = createElement("div", { class: "user-item" }, [
                createElement("a", { href: `/profile/${user.username}` }, [user.display_name || user.username])
            ]);
            container.appendChild(item);
        });
    } catch (err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load people."])
            ])
        );
    }
}

// Render "Media" tab
async function renderMediaTab(container, hashtag, page = 0, limit = DEFAULT_LIMIT) {
    const loading = createElement("p", { class: "loading" }, ["Loading media..."]);
    container.appendChild(loading);

    try {
        const posts = await apiFetch(`/hashtags/hashtag/${hashtag}?page=${page}&limit=${limit}`);
        container.textContent = "";

        if (!posts.length) {
            container.appendChild(
                createElement("div", { class: "empty-state" }, [
                    createElement("p", {}, ["No media found for this hashtag."])
                ])
            );
            return;
        }

        const grid = createElement("div", { class: "hashtag-grid" }, []);
        posts.forEach(post => {
            const mediaUrls = Array.isArray(post.media_url)
                ? post.media_url
                : post.media_url ? [post.media_url] : [];

            if (!mediaUrls.length) return;

            const thumbSrc =
                post.type === "video"
                    ? resolveImagePath(EntityType.FEED, PictureType.VIDEO, mediaUrls[0])
                    : resolveImagePath(EntityType.FEED, PictureType.IMAGE, mediaUrls[0]);

            const card = createElement(
                "a",
                { class: "grid-item", href: `/feedpost/${post.postid}` },
                [
                    Imagex( {
                        src: thumbSrc,
                        alt: post.title || "Post",
                        loading: "lazy"
                    })
                ]
            );

            grid.appendChild(card);
        });
        container.appendChild(grid);
    } catch (err) {
        container.textContent = "";
        container.appendChild(
            createElement("div", { class: "error-state" }, [
                createElement("p", {}, ["⚠️ Failed to load media. Please try again later."])
            ])
        );
    }
}

// --- Main Function ---
export async function displayHashtag(contentContainer, hashtag, isLoggedIn) {
    // Clear old content
    while (contentContainer.firstChild) {
        contentContainer.removeChild(contentContainer.firstChild);
    }

    // Page wrapper
    const hashcon = createElement("div", { id: "hashcon", class: "hashtag-page" }, []);

    // --- Header row ---
    const header = createElement("div", { class: "hashtag-header hvflex-sb" }, [
        createElement("h2", { class: "hashtag-title" }, [`#${hashtag}`])
    ]);

    if (isLoggedIn) {
        const reportBtn = createElement("button", { class: "report-btn" }, ["Report"]);
        reportBtn.addEventListener("click", () => {
            reportPost(hashtag);
        });
        header.appendChild(reportBtn);
    }

    hashcon.appendChild(header);

    // --- Tabs ---
    const tabs = createTabs(
        [
            {
                id: "top",
                title: "Top",
                render: async container => renderTopTab(container, hashtag)
            },
            {
                id: "latest",
                title: "Latest",
                render: async container => renderLatestTab(container, hashtag)
            },
            {
                id: "people",
                title: "People",
                render: async container => renderPeopleTab(container, hashtag)
            },
            {
                id: "media",
                title: "Media",
                render: async container => renderMediaTab(container, hashtag)
            }
        ],
        `hashtag-${hashtag}`,
        "top"
    );

    hashcon.appendChild(tabs);
    contentContainer.appendChild(hashcon);
}
