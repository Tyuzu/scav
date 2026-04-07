import { apiFetch, bannerFetch } from "../../api/api";
import { createElement } from "../../components/createElement";
import { createFormGroup } from "../../components/createFormGroup.js";
import Button from "../../components/base/Button.js";
import { capitalize } from "../profile/profileHelpers.js";
import { resolveImagePath } from "../../utils/imagePaths.js";
import { navigate } from "../../routes/index.js";

/* ---------------------- BLOCK PLUGINS ---------------------- */
const BlockPlugins = {
  text: {
    create: () => ({ type: "text", content: "" }),
    render: (block, update) => {
      const input = createElement("textarea", { rows: 3 }, [block.content || ""]);
      input.setAttribute("name","textin");
      input.addEventListener("input", () => update({ ...block, content: input.value }));
      return createElement("div", { class: "block block-text" }, [
        createElement("span", { class: "block-label" }, ["Text Block"]),
        input
      ]);
    },
    sanitize: (b) => (b.content?.trim() ? b : null)
  },

  image: {
    create: () => ({ type: "image", url: "" }),
    render: (block, update) => {
      const fileInput = createElement("input", { type: "file", accept: "image/*" });
      const preview = createElement("img", { class: "image-preview" });
      if (block.url) {
preview.setAttribute("src", resolveImagePath("post", "photo", block.url));
}

      fileInput.addEventListener("change", async () => {
        if (!fileInput.files.length) {
return;
}
        const formData = new FormData();
        formData.append("image", fileInput.files[0]);
        try {
          const res = await bannerFetch("/api/v1/filedrop/feedpost", "POST", formData, { isForm: true });
          update({ ...block, url: res.url });
          preview.setAttribute("src", resolveImagePath("post", "photo", res.url));
        } catch (err) {
          console.error("Upload failed", err);
        }
      });

      return createElement("div", { class: "block block-image" }, [
        createElement("span", { class: "block-label" }, ["Image Block"]),
        fileInput,
        preview
      ]);
    },
    sanitize: (b) => (b.url?.trim() ? b : null)
  },

  code: {
    create: () => ({ type: "code", language: "js", content: "" }),
    render: (block, update) => {
      const langInput = createElement("input", { type: "text", placeholder: "Language", value: block.language });
      const codeArea = createElement("textarea", { rows: 5 }, [block.content || ""]);
      langInput.addEventListener("input", () => update({ ...block, language: langInput.value }));
      codeArea.addEventListener("input", () => update({ ...block, content: codeArea.value }));
      return createElement("div", { class: "block block-code" }, [
        createElement("span", { class: "block-label" }, ["Code Block"]),
        langInput,
        codeArea
      ]);
    },
    sanitize: (b) => (b.content?.trim() ? b : null)
  },

  video: {
    create: () => ({ type: "video", url: "", caption: "" }),
    render: (block, update) => {
      const urlInput = createElement("input", { type: "text", placeholder: "Video URL", value: block.url });
      const captionInput = createElement("input", { type: "text", placeholder: "Caption", value: block.caption });
      const preview = createElement("video", { controls: true, class: "video-preview" });
      if (block.url) {
preview.setAttribute("src", block.url);
}

      urlInput.addEventListener("input", () => {
        update({ ...block, url: urlInput.value });
        preview.setAttribute("src", urlInput.value);
      });
      captionInput.addEventListener("input", () => update({ ...block, caption: captionInput.value }));

      return createElement("div", { class: "block block-video" }, [
        createElement("span", { class: "block-label" }, ["Video Block"]),
        urlInput,
        captionInput,
        preview
      ]);
    },
    sanitize: (b) => (b.url?.trim() ? b : null)
  }
};

/* ---------------------- POST TYPE PLUGINS ---------------------- */
const PostTypes = {
  standard: {
    label: "Standard",
    availableBlocks: ["text", "image"],
    fields: []
  },
  guide: {
    label: "Guide",
    availableBlocks: ["text", "image", "code"],
    fields: [
      { id: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"] }
    ]
  },
  tutorial: {
    label: "Tutorial",
    availableBlocks: ["text", "image", "code", "video"],
    fields: [
      { id: "duration", label: "Duration (mins)", type: "text", placeholder: "e.g. 20" }
    ]
  },
  recipe: {
    label: "Recipe",
    availableBlocks: ["text", "image", "video"],
    fields: [
      { id: "servings", label: "Servings", type: "text", placeholder: "e.g. 4" },
      { id: "cookTime", label: "Cook Time", type: "text", placeholder: "e.g. 30 mins" }
    ]
  }
};

/* ---------------------- HELPERS ---------------------- */
function createSelectGroup({ id, label, value, options, required = false }) {
  return createFormGroup({
    type: "select",
    id,
    name: id,
    label,
    value,
    options,
    required
  });
}

function createTextGroup({ id, label, value, placeholder, required = false }) {
  return createFormGroup({
    type: "text",
    id,
    name: id,
    label,
    value,
    placeholder,
    required
  });
}

/* ---------------------- BLOCK MANAGER ---------------------- */
function createBlockManager(blocksContainer, blocksTextarea) {
  let blocks = [];

  function sync() {
    blocksTextarea.querySelector("textarea").value = JSON.stringify(blocks, null, 2);
  }

  function render() {
    blocksContainer.replaceChildren();
    blocks.forEach((block, i) => {
      const plugin = BlockPlugins[block.type];
      if (!plugin) {
return;
}

      const node = plugin.render(block, (newBlock) => {
        blocks[i] = newBlock;
        sync();
      });

      const removeBtn = Button("Remove", `remove-${i}`, {
        click: () => {
          blocks.splice(i, 1);
          render();
          sync();
        }
      }, "buttonx");

      node.appendChild(removeBtn);
      setupDrag(node, i);
      blocksContainer.appendChild(node);
    });
  }

  function setupDrag(node, i) {
    node.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", i));
    node.addEventListener("dragover", e => {
 e.preventDefault(); node.classList.add("drag-over"); 
});
    node.addEventListener("dragleave", () => node.classList.remove("drag-over"));
    node.addEventListener("drop", e => {
      e.preventDefault();
      node.classList.remove("drag-over");
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (fromIndex !== i) {
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(i, 0, moved);
        render();
        sync();
      }
    });
  }

  function addBlock(type) {
    const plugin = BlockPlugins[type];
    if (!plugin) {
return console.warn("Unknown block type:", type);
}
    blocks.push(plugin.create());
    render();
    sync();
  }

  function getSanitizedBlocks() {
    return blocks.map(b => BlockPlugins[b.type]?.sanitize(b)).filter(Boolean);
  }

  return {
    setBlocks: b => {
 blocks = b; render(); sync(); 
},
    addBlock,
    getBlocks: () => blocks,
    getSanitizedBlocks,
    render,
    sync
  };
}

/* ---------------------- MAIN EDITOR ---------------------- */
async function renderPostEditor({ isLoggedIn, postId, contentContainer, mode }) {
  if (!isLoggedIn) {
    return contentContainer.replaceChildren(
      createElement("div", {}, ["You must be logged in to " + mode + " a post."])
    );
  }

  let existingPost = null;
  if (mode === "edit" && postId) {
    try {
      const data = await apiFetch(`/posts/post/${postId}`);
      existingPost = data.post;
    } catch {
      return contentContainer.replaceChildren(createElement("div", {}, ["Failed to load post."]));
    }
  }

  const postTypeGroup = createSelectGroup({
    id: "postType",
    label: "Post Type",
    value: existingPost?.type || "standard",
    options: Object.keys(PostTypes).map(t => capitalize(t)),
    required: true
  });

  const titleGroup = createTextGroup({
    id: "title",
    label: "Title",
    value: existingPost?.title || "",
    placeholder: "Enter post title",
    required: true
  });

  /* ---------------------- HASHTAGS FIELD ---------------------- */
  const hashtagsGroup = createFormGroup({
    type: "text",
    id: "hashtags",
    name: "hashtags",
    label: "Hashtags",
    value: existingPost?.hashtags ? existingPost.hashtags.join(", ") : "",
    placeholder: "e.g. javascript, webdev, tips"
  });

  // category and subcategory dropdowns with dependency
  const categoryMap = {
    Blog: ["Tips", "Opinion", "News", "Updates"],
    Coding: ["JavaScript", "Go", "Python", "Rust"],
    Design: ["UI", "UX", "Branding"],
    Food: ["Recipes", "Reviews", "Guides"],
    Travel: ["Destinations", "Tips", "Stories"],
    General: ["Misc"]
  };

  const categoryOptions = Object.keys(categoryMap);
  const defaultCategory = existingPost?.category || "General";

  const categoryGroup = createSelectGroup({
    id: "category",
    label: "Category",
    value: defaultCategory,
    options: categoryOptions,
    required: true
  });

  const subcategoryOptions = categoryMap[defaultCategory] || [];
  const defaultSub = existingPost?.subcategory || subcategoryOptions[0] || "Misc";

  const subcategoryGroup = createSelectGroup({
    id: "subcategory",
    label: "Subcategory",
    value: defaultSub,
    options: subcategoryOptions,
    required: true
  });

  // update subcategory when category changes
  categoryGroup.querySelector("select").addEventListener("change", e => {
    const selectedCat = e.target.value;
    const newSubs = categoryMap[selectedCat] || [];
    const subSelect = subcategoryGroup.querySelector("select");
    subSelect.replaceChildren(
      ...newSubs.map(s => createElement("option", { value: s }, [s]))
    );
    subSelect.value = newSubs.includes(existingPost?.subcategory) ? existingPost.subcategory : newSubs[0] || "";
  });

  const messageBox = createElement("div", { id: "message-box" });
  const blocksContainer = createElement("div", { class: "blocks-container" });
  const blocksTextarea = createFormGroup({ type: "textarea", id: "blocks", label: "Blocks", value: "" });
  blocksTextarea.style.display = "none";

  const blockManager = createBlockManager(blocksContainer, blocksTextarea);
  blockManager.setBlocks(existingPost ? existingPost.blocks : []);

  const addBlockButtons = createElement("div", { class: "block-buttons" });
  function renderAddBlockButtons(typeKey) {
    addBlockButtons.replaceChildren();
    const typeCfg = PostTypes[typeKey];
    typeCfg.availableBlocks.forEach(bt => {
      const btn = Button("Add " + capitalize(bt) + " Block", "add-" + bt, {
        click: () => blockManager.addBlock(bt)
      }, "buttonx");
      addBlockButtons.appendChild(btn);
    });
  }
  renderAddBlockButtons(existingPost?.type || "standard");

  postTypeGroup.querySelector("select").addEventListener("change", e => {
    const selected = e.target.value.toLowerCase();
    renderAddBlockButtons(selected);
    renderExtraFields(selected);
  });

  const extraFieldsContainer = createElement("div", { class: "extra-fields" });
  function renderExtraFields(typeKey) {
    extraFieldsContainer.replaceChildren();
    const cfg = PostTypes[typeKey];
    cfg.fields.forEach(f => {
      const grp = createFormGroup({
        type: f.type,
        id: f.id,
        name: f.id,
        label: f.label,
        value: existingPost?.[f.id] || "",
        options: f.options || [],
        placeholder: f.placeholder || ""
      });
      extraFieldsContainer.appendChild(grp);
    });
  }
  renderExtraFields(existingPost?.type || "standard");

  const submitBtn = Button(mode === "create" ? "Create" : "Update", "submit-post", {
    click: async () => {
      const typeKey = postTypeGroup.querySelector("select").value.toLowerCase();
      const cfg = PostTypes[typeKey];

      const formData = new FormData();
      formData.append("type", typeKey);
      formData.append("title", titleGroup.querySelector("input").value.trim());
      formData.append("category", categoryGroup.querySelector("select").value.trim());
      formData.append("subcategory", subcategoryGroup.querySelector("select").value.trim());

      /* ---------------------- ADD HASHTAGS TO FORM ---------------------- */
      const rawTags = hashtagsGroup.querySelector("input").value.trim();
      if (rawTags) {
        rawTags
          .split(",")
          .map(t => t.trim())
          .filter(Boolean)
          .forEach(tag => formData.append("hashtags", tag));
      }

      cfg.fields.forEach(f => {
        const el = extraFieldsContainer.querySelector(`[name=${f.id}]`);
        if (el && el.value.trim()) {
formData.append(f.id, el.value.trim());
}
      });

      formData.append("blocks", JSON.stringify(blockManager.getSanitizedBlocks(), null, 2));

      const endpoint = mode === "create" ? "/posts/post" : `/posts/post/${postId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      try {
        const res = await apiFetch(endpoint, method, formData, { isForm: true });
        messageBox.replaceChildren(createElement("span", {}, ["Saved successfully"]));
        navigate(`/post/${res.postid}`);
      } catch (err) {
        messageBox.replaceChildren(createElement("span", {}, ["Error: " + (err.message || "Unknown error")]));
      }
    }
  }, "buttonx");

  const form = createElement("div", { class: "post-editor" }, [
    postTypeGroup,
    titleGroup,
    hashtagsGroup,
    categoryGroup,
    subcategoryGroup,
    extraFieldsContainer,
    blocksContainer,
    addBlockButtons,
    blocksTextarea,
    submitBtn,
    messageBox
  ]);

  contentContainer.replaceChildren(
    createElement("div", { class: "create-section" }, [
      createElement("h2", {}, [`${capitalize(mode)} Post`]),
      form
    ])
  );
}

/* ---------------------- PUBLIC API ---------------------- */
export async function createPost(isLoggedIn, contentContainer) {
  return renderPostEditor({ isLoggedIn, contentContainer, mode: "create" });
}

export async function editPost(isLoggedIn, postId, contentContainer) {
  return renderPostEditor({ isLoggedIn, postId, contentContainer, mode: "edit" });
}

export { renderPostEditor };
