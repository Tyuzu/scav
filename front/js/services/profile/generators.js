import { createElement } from "../../components/createElement.js";
import { createAvatar, updateAvatar } from "./avatarPicture.js";
import { createBanner, updateBanner } from "./bannerPicture.js";

export {
  createAvatar,
  createBanner,
  updateAvatar,
  updateBanner
};

// Optional unified function if you still want type-based dispatch:
export async function updateUserPicture(type) {
  if (type === "avatar") return updateAvatar();
  if (type === "banner") return updateBanner();
  console.error(`Unknown picture type: ${type}`);
  return false;
}

export function generateFormField(label, id, type, value = "") {
  const wrapper = createElement("div", { class: "form-group" });

  const labelEl = createElement("label", { for: id }, [label]);

  let inputEl;
  if (type === "textarea") {
    inputEl = createElement("textarea", {
      id,
      name: id,
      rows: 4
    });
    inputEl.value = value;
  } else {
    inputEl = createElement("input", {
      id,
      name: id,
      type,
      value
    });
  }

  wrapper.appendChild(labelEl);
  wrapper.appendChild(inputEl);

  return wrapper;
}

