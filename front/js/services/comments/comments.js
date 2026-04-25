import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { debounce } from "../../utils/deutils.js";
import Datex from "../../components/base/Datex.js";
import { reportPost } from "../reporting/reporting.js";

/* =========================
   CONFIG
========================= */

const PAGE_SIZE = 10;

/* =========================
   STATE
========================= */

const commentState = new Map();
const userCache = new Map();

/* =========================
   HELPERS
========================= */

function makeKey(entityType, entityId) {
    return JSON.stringify([entityType, entityId]);
}

function mapSort(val) {
    return val === "oldest" ? "old" : "new";
}

async function getUsersMeta(ids) {
    const missing = ids.filter(id => !userCache.has(id));
    if (missing.length) {
        try {
            const data = await fetchUserMeta(missing);
            Object.entries(data).forEach(([id, u]) => userCache.set(id, u));
        } catch (e) {
            console.error("User meta fetch failed", e);
        }
    }

    return Object.fromEntries(ids.map(id => [id, userCache.get(id) || {}]));
}

async function fetchComments(entityType, entityId, page, sort) {
    console.warn("entityType: ",entityType);
    console.warn("entityId: ", entityId);
    console.warn("page: ", page);
    console.warn("sort: ", sort);
    try {
        const res = await apiFetch(
            `/comments/${entityType}/${entityId}?sort=${mapSort(sort)}&page=${page}`
        );
        return Array.isArray(res) ? res : [];
    } catch (err) {
        console.error("Failed to fetch comments", err);
        return [];
    }
}

function showError(container, msg) {
    container.appendChild(
        createElement("p", { class: "comment-error" }, [msg])
    );
}

/* =========================
   RENDER
========================= */

function renderComment(comment, entityType, entityId) {
    const user = comment.user || {};

    const avatarLeft = Imagex({
        src: resolveImagePath(EntityType.USER, PictureType.THUMB, comment.createdBy),
        alt: `${user.username || "Unknown"} avatar`,
        classes: "comment-avatar",
        style: "cursor:pointer;"
    });

    avatarLeft.addEventListener("click", () => {
        if (user.username) {
            navigate(`/user/${user.username}`);
        }
    });

    const usernameEl = createElement("span", {
        class: "comment-username",
        style: "cursor:pointer;"
    }, [user.username || "Unknown"]);

    usernameEl.addEventListener("click", () => {
        if (user.username) {
            navigate(`/user/${user.username}`);
        }
    });

    const header = createElement("div", { class: "comment-header" }, [
        usernameEl,
        createElement("span", { class: "comment-timestamp" }, [
            comment.createdAt ? Datex(comment.createdAt) : ""
        ])
    ]);

    const body = createElement("div", { class: "comment-body" }, [
        createElement("p", {}, [comment.content || ""])
    ]);

    const actions = createElement("div", { class: "comment-actions" }, [
        Button("Reply", "", {
            click: () => console.warn("Reply:", comment.commentid)
        }, "comment-reply buttonx"),
        Button("Report", "", {
            click: () => reportPost(comment.commentid, "comment", entityType, entityId)
        }, "comment-report buttonx")
    ]);

    return createElement("div", { class: "comment" }, [
        createElement("div", { class: "comment-left" }, [avatarLeft]),
        createElement("div", { class: "comment-right" }, [header, body, actions])
    ]);
}

async function appendComments(state, comments, toTop = false) {
    const ids = [...new Set(comments.map(c => c.createdBy))];
    const usersMeta = await getUsersMeta(ids);

    const fragment = document.createDocumentFragment();

    comments.forEach(c => {
        const user = usersMeta[c.createdBy] || {};
        const node = renderComment({ ...c, user }, state.entityType, state.entityId);
        fragment.appendChild(node);
    });

    if (toTop) {
        state.list.prepend(fragment);
    } else {
        state.list.appendChild(fragment);
    }
}

/* =========================
   LOAD
========================= */

async function loadComments(key, reset = false) {
    const state = commentState.get(key);
    if (!state || state.loading) {
        return;
    }

    state.loading = true;

    try {
        if (reset) {
            state.page = 1;
            state.hasMore = true;
            state.list.replaceChildren();
        }

        const data = await fetchComments(
            state.entityType,
            state.entityId,
            state.page,
            state.sort
        );

        state.hasMore = data.length === PAGE_SIZE;

        if (!data.length && reset) {
            showError(state.list, "No comments yet.");
            return;
        }

        await appendComments(state, data);

    } catch {
        showError(state.list, "Failed to load comments.");
    } finally {
        state.loading = false;
    }
}

/* =========================
   PAGINATION
========================= */

async function fetchMoreComments(key) {
    const state = commentState.get(key);
    if (!state || !state.hasMore || state.loading) {
        return;
    }

    state.loading = true;

    try {
        state.page += 1;

        const data = await fetchComments(
            state.entityType,
            state.entityId,
            state.page,
            state.sort
        );

        if (!data.length) {
            state.hasMore = false;
            return;
        }

        state.hasMore = data.length === PAGE_SIZE;

        await appendComments(state, data);

    } catch {
        showError(state.list, "Failed to load more comments.");
    } finally {
        state.loading = false;
    }
}

/* =========================
   SUBMIT
========================= */

async function handleSubmit(e, key) {
    e.preventDefault();

    const state = commentState.get(key);
    if (!state || !state.currentUser) {
        return;
    }

    const content = state.input.value.trim();
    if (!content) {
        return;
    }

    try {
        const newComment = await apiFetch(
            `/comments/${state.entityType}/${state.entityId}`,
            "POST",
            { content }
        );

        const usersMeta = await getUsersMeta([newComment.createdBy]);
        const user = usersMeta[newComment.createdBy] || {};

        state.input.value = "";

        await appendComments(state, [{ ...newComment, user }], true);

    } catch {
        showError(state.list, "Failed to post comment.");
    }
}

/* =========================
   PUBLIC API
========================= */

export function createCommentsSection(entityType, entityId, currentUser) {
    const key = makeKey(entityType, entityId);

    const container = createElement("div", {
        class: "comments-section"
    });

    const list = createElement("div", { class: "comments-list" });

    const sort = createElement("select", { class: "comment-sort" }, [
        createElement("option", { value: "newest" }, ["Newest"]),
        createElement("option", { value: "oldest" }, ["Oldest"])
    ]);

    const loadMoreBtn = Button(
        "Load More",
        "",
        { click: () => fetchMoreComments(key) },
        "load-more-comments buttonx"
    );

    const form = createElement("form", { class: "comment-form" }, [
        createElement("textarea", {
            class: "comment-input",
            placeholder: currentUser ? "Write a comment..." : "Login to comment",
            disabled: !currentUser
        }),
        createElement("button", {
            type: "submit",
            disabled: !currentUser
        }, ["Post"])
    ]);

    container.append(sort, form, list, loadMoreBtn);

    const state = {
        entityType,
        entityId,
        currentUser,
        list,
        input: form.querySelector("textarea"),
        sort: "newest",
        page: 1,
        hasMore: true,
        loading: false
    };

    commentState.set(key, state);

    loadComments(key, true);

    form.addEventListener("submit", e => handleSubmit(e, key));

    sort.addEventListener(
        "change",
        debounce(e => {
            const s = commentState.get(key);
            if (!s) {
                return;
            }
            s.sort = e.target.value;
            loadComments(key, true);
        }, 250)
    );

    return container;
}

/* =========================
   CLEANUP (optional)
========================= */

export function destroyCommentsSection(entityType, entityId) {
    const key = makeKey(entityType, entityId);
    commentState.delete(key);
}