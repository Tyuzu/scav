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
   INTERNAL STATE
========================= */

const commentState = new Map();

/* =========================
   SORT MAPPING
========================= */

function mapSort(val) {
    if (val === "newest") {
return "new";
}
    if (val === "oldest") {
return "old";
}
    return "new";
}

/* =========================
   API
========================= */

async function fetchComments(entityType, entityId, page = 1, sort = "newest") {
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


/* =========================
   RENDER SINGLE COMMENT
========================= */

function renderComment(comment, entityType, entityId) {
    const user = comment.user || {};
    const avatarSrc = resolveImagePath(
        EntityType.USER,
        PictureType.THUMB,
        comment.createdBy
    );

    const avatar = Imagex({
        src: avatarSrc,
        alt: `${user.username || "Unknown"} avatar`,
        classes: "comment-avatar",
        style: "cursor:pointer;"
    });

    avatar.addEventListener("click", () => {
        if (user.username) {
navigate(`/user/${user.username}`);
}
    });

    const usernameEl = createElement(
        "span",
        {
            class: "comment-username",
            style: "cursor:pointer;"
        },
        [user.username || "Unknown"]
    );

    usernameEl.addEventListener("click", () => {
        if (user.username) {
navigate(`/user/${user.username}`);
}
    });

    const header = createElement("div", { class: "comment-header" }, [
        avatar,
        usernameEl,
        createElement("span", { class: "comment-timestamp" }, [
            comment.createdAt ? Datex(comment.createdAt) : ""
        ])
    ]);

    const body = createElement("div", { class: "comment-body" }, [
        createElement("p", {}, [comment.content || ""])
    ]);

    const actions = createElement("div", { class: "comment-actions" }, [
        Button(
            "Reply",
            `reply-${comment.commentid}`,
            { click: () => console.warn("Reply to:", comment.commentid) },
            "comment-reply buttonx"
        ),
        Button(
            "Report",
            `report-${comment.commentid}`,
            {
                click: () => {
                    reportPost(comment.commentid, "comment", entityType, entityId);
                }
            },
            "comment-report buttonx"
        )
    ]);

    return createElement("div", { class: "comment" }, [
        createElement("div", { class: "comment-left" }, [avatar]),
        createElement("div", { class: "comment-right" }, [header, body, actions])
    ]);
}

/* =========================
   RENDER COMMENTS LIST
========================= */

async function renderComments(key) {
    const state = commentState.get(key);
    if (!state) {
return;
}

    state.list.replaceChildren();

    if (!state.comments.length) {
return;
}

    const userIds = [...new Set(state.comments.map(c => c.createdBy))];
    const usersMeta = await fetchUserMeta(userIds);

    state.comments.forEach(c => {
        const user = usersMeta[c.createdBy] || {};
        state.list.appendChild(renderComment({ ...c, user }, state.entityType, state.entityId));
    });

    if (state.hasMore) {
        const loadMoreBtn = Button(
            "Load More",
            "",
            { click: () => fetchMoreComments(key) },
            "load-more-comments buttonx"
        );

        state.list.appendChild(
            createElement("div", { class: "comment-load-more" }, [loadMoreBtn])
        );
    }
}

/* =========================
   PAGINATION
========================= */

async function fetchMoreComments(key) {
    const state = commentState.get(key);
    if (!state || !state.hasMore) {
return;
}

    const nextPage = state.page + 1;
    const newComments = await fetchComments(
        state.entityType,
        state.entityId,
        nextPage,
        state.sort
    );

    if (!newComments.length) {
        state.hasMore = false;
    } else {
        state.comments.push(...newComments);
        state.page = nextPage;
    }

    renderComments(key);
}

/* =========================
   LOAD / RESET
========================= */

async function loadComments(key, reset = false) {
    const state = commentState.get(key);
    if (!state) {
return;
}

    if (reset) {
        state.comments = [];
        state.page = 1;
        state.hasMore = true;
    }

    const fresh = await fetchComments(
        state.entityType,
        state.entityId,
        state.page,
        state.sort
    );

    state.comments = fresh;
    state.hasMore = fresh.length > 0;

    renderComments(key);
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

        const usersMeta = await fetchUserMeta([newComment.createdBy]);
        const user = usersMeta[newComment.createdBy] || {};

        state.comments.unshift({ ...newComment, user });
        state.input.value = "";
        await renderComments(key);
    } catch (err) {
        console.error("Failed to post comment", err);
    }
}


/* =========================
   PUBLIC API
========================= */

export function createCommentsSection(entityType, entityId, currentUser) {
    const key = `${entityType}:${entityId}`;

    const container = createElement("div", {
        class: "comments-section",
        dataset: { entityType, entityId }
    }, []);

    const list = createElement("div", { class: "comments-list" });

    const sort = createElement("select", { class: "comment-sort" }, [
        createElement("option", { value: "newest" }, ["Newest"]),
        createElement("option", { value: "oldest" }, ["Oldest"])
    ]);

    const form = createElement("form", { class: "comment-form" }, [
        createElement("textarea", {
            class: "comment-input",
            placeholder: currentUser
                ? "Write a comment..."
                : "Login to comment",
            disabled: !currentUser
        }),
        createElement(
            "button",
            { type: "submit", disabled: !currentUser },
            ["Post"]
        )
    ]);

    container.append(sort, form, list);

    const state = {
        entityType,
        entityId,
        currentUser,
        comments: [],
        list,
        form,
        input: form.querySelector("textarea"),
        sort: "newest",
        page: 1,
        hasMore: true
    };

    commentState.set(key, state);

    loadComments(key, true);

    form.addEventListener("submit", e => handleSubmit(e, key));

    sort.addEventListener(
        "change",
        debounce(e => {
            const state = commentState.get(key);
            if (!state) {
return;
}
            state.sort = e.target.value;
            loadComments(key, true);
        }, 300)
    );

    return container;
}
