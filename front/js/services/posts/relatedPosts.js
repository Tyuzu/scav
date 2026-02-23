import { apiFetch } from "../../api/api";
import { createElement } from "../../components/createElement";
import { navigate } from "../../routes/index.js";

export async function renderRelatedPosts(post) {
  const container = createElement("div", { class: "related-posts" }, [
    createElement("h4", {}, ["Related Posts"])
  ]);

  try {
    // Fetch related posts from backend
    const data = await apiFetch(
      `/posts/post/${post.postid}/related?postid=${encodeURIComponent(post.postid)}&category=${encodeURIComponent(post.category)}&subcategory=${encodeURIComponent(post.subcategory)}`
    );

    if (!data.related?.length) {
      container.appendChild(createElement("p", {}, ["No related posts found."]));
      return container;
    }

    const list = createElement("div", { class: "related-list" });

    data.related.forEach(rp => {
      const item = createElement("div", { class: "related-item" }, [
        createElement("a", {
          href: `/posts/${rp.postid}`,
          click: e => {
            e.preventDefault();
            navigate(`/posts/${rp.postid}`);
          }
        }, [rp.title || "Untitled"]),
        createElement("p", { class: "related-meta" }, [
          `${rp.category} › ${rp.subcategory}`
        ])
      ]);
      list.appendChild(item);
    });

    container.appendChild(list);
  } catch (err) {
    console.error("Failed to load related posts:", err);
    container.appendChild(createElement("p", {}, ["Error loading related posts."]));
  }

  return container;
}
