import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../home/homeHelpers.js";
import Datex from "../../components/base/Datex.js";

export async function displayPosts(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "posts-page" });
  const aside = createElement("aside", { class: "posts-aside" });
  const main = createElement("div", { class: "posts-main" });

  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(
    createElement("h2", {}, ["Actions"]),
    adspace("aside")
  );

  if (isLoggedIn) {
    aside.append(
      Button(
        "Create Post",
        "posts-create-btn",
        { click: () => navigate("/create-post") },
        "buttonx"
      )
    );
  }

  // ---------- TITLE ----------
  main.append(createElement("h1", {}, ["All Posts"]));

  // ---------- BODY AD ----------
  main.append(adspace("inbody"));

  // ---------- FETCH POSTS ----------
  let posts = [];
  try {
    const resp = await apiFetch("/posts?page=1&limit=100");
    posts = Array.isArray(resp) ? resp : resp?.data || resp?.posts || [];
  } catch (err) {
    console.error("Failed to load posts", err);
  }

  // ---------- LIST ----------
  const list = createElement("div", { class: "posts-list" });

  if (!posts.length) {
    list.append(createElement("p", {}, ["No posts found."]));
    main.append(list);
    return;
  }

  posts.forEach((post, idx) => {
    list.append(createPostCard(post));

    if ((idx + 1) % 6 === 0) {
      list.append(adspace("inlist"));
    }
  });

  main.append(list);
}

// ---------- CARD BUILDER ----------
function createPostCard(post) {
  const thumb = post.thumb
    ? resolveImagePath(EntityType.POST, PictureType.THUMB, post.thumb)
    : "/default-thumb.png";

  const postThumb = Imagex({
    src: thumb,
    alt: post.title || "Post image",
    loading: "lazy",
    classes: "",
    style: "width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:4px;"
  });

  const postInfo = createElement("div", { class: "post-info" }, [
    createElement("h3", {}, [post.title || "Untitled"]),
    createElement("p", {}, [
      createElement("strong", {}, ["Category: "]),
      post.category || "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Subcategory: "]),
      post.subcategory || "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["Posted on: "]),
      post.createdAt ? Datex(post.createdAt) : "-"
    ]),
    createElement("p", {}, [
      createElement("strong", {}, ["By: "]),
      post.username || "-"
    ])
  ]);

  const card = createElement("div", { class: "post-card" }, [
    postThumb,
    postInfo
  ]);

  return createElement(
    "a",
    {
      href: "#",
      events: {
        click: e => {
          e.preventDefault();
          navigate(`/post/${encodeURIComponent(post.postid)}`);
        }
      }
    },
    [card]
  );
}
