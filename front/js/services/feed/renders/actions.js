import { createElement } from "../../../components/createElement.js";
import { svgToNode, deletePost } from "./helpers.js";
import { heartSVG, commentSVG, morevSVG, shareSVG } from "../../../components/svgs.js";
import Button from "../../../components/base/Button.js";
import { openEditModal } from "./postEditor.js";
import { debounce } from "../../../utils/deutils.js";
import { toggleLike } from "../../beats/likes.js";
import { createCommentsSection } from "../../comments/comments.js";
import { reportPost } from "../../reporting/reporting.js";
import { MAIN_URL, getState } from "../../../state/state.js";

export async function createActions(metadata, isCreator, postElement) {
    const { postId, likes, comments, likedByUser } = metadata;
    const actionsContainer = createElement("div", { class: "post-actions" });
    const user = getState("user");
    const isLoggedIn = Boolean(getState("token"));

    // LIKE BUTTON
    const likeLabel = createElement("span", {}, [likes]);
    const likeButton = createElement("button", { class: likedByUser ? "like liked" : "like" }, [
        svgToNode(heartSVG),
        likeLabel
    ]);

    if (isLoggedIn) {
        likeButton.addEventListener("click", debounce(async () => {
            try {
                const result = await toggleLike("post", postId);
                if (result && typeof result.count === "number") {
                    likeLabel.textContent = result.count;
                    likeButton.classList.toggle("liked", result.liked);
                }
            } catch (err) {
                console.error("Failed to toggle like", err);
            }
        }, 500));
    }

    actionsContainer.appendChild(likeButton);

    // COMMENT BUTTON
    const commentLabel = createElement("span", {}, [comments]);
    const commentButton = createElement("button", { class: "comment" }, [svgToNode(commentSVG),commentLabel]);
    commentButton.addEventListener("click", () => {
        if (!postElement.commentSectionVisible) {
            const commentsEl = createCommentsSection(postId, [], "feed", user?.id);
            console.log(user?.id);
            postElement.appendChild(commentsEl);
            postElement.commentSectionVisible = true;
        }
    });
    actionsContainer.appendChild(commentButton);

let embedURL = `${MAIN_URL}/embed/${postId}`;
    let shareButton = createElement("button", {
        class: "comment", events: {
            click: () => { navigator.clipboard.writeText(embedURL) }
        }
    }, [svgToNode(shareSVG)]);

    actionsContainer.appendChild(shareButton);


    // MORE MENU
    const moreButton = createElement("button", { class: "more-btn" }, [svgToNode(morevSVG)]);
    const dropdownx = createElement("div", { class: "dropxdown hidden" });

    const closeDropdown = () => dropdownx.classList.add("hidden");

    // Report option
    const reportButton = createElement("button", { class: "report-btn" }, ["Report"]);
    reportButton.addEventListener("click", () => {
        closeDropdown();
        reportPost(postId, "post");
    });
    dropdownx.appendChild(reportButton);

    // Creator actions
    if (isCreator) {
        const deleteButton = createElement("button", { class: "delete-btn" }, ["Delete"]);
        deleteButton.addEventListener("click", () => {
            closeDropdown();
            deletePost(postId, postElement);
        });
        dropdownx.appendChild(deleteButton);

        const editBtn = Button("Edit", "", { click: () => openEditModal({ postId }, postElement.parentElement) }, "edit-btn");
        dropdownx.appendChild(editBtn);
    }

    const moreWrapper = createElement("div", { class: "more-wrapper" }, [moreButton, dropdownx]);
    actionsContainer.appendChild(moreWrapper);

    moreButton.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownx.classList.toggle("hidden");

        if (!dropdownx.classList.contains("hidden")) {
            const handleClickOutside = (event) => {
                if (!moreWrapper.contains(event.target)) {
                    closeDropdown();
                    document.removeEventListener("click", handleClickOutside);
                    document.removeEventListener("keydown", handleEsc);
                }
            };

            const handleEsc = (event) => {
                if (event.key === "Escape") {
                    closeDropdown();
                    document.removeEventListener("click", handleClickOutside);
                    document.removeEventListener("keydown", handleEsc);
                }
            };

            document.addEventListener("click", handleClickOutside);
            document.addEventListener("keydown", handleEsc);
        }
    });

    return actionsContainer;
}
