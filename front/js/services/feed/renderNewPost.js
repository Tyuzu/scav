import { renderPost } from "./renders/renderPost.js";

/**
 * Convenience wrapper to render post into default container
 */
export function renderNewPost(post, i, container) {
  let postmetadata = {};
  renderPost(post, container, postmetadata, i);
}

export { renderPost };