import { getState, setState } from "../../state/state.js";
import { bannerFetch } from "../../api/api.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { showLoadingMessage, removeLoadingMessage } from "./profileHelpers.js";
import { createElement } from "../../components/createElement.js";
import { handleError } from "../../utils/utils.js";
import SightBox from "../../components/ui/SightBox.mjs";
import { openCropper } from "../../utils/cropper.js";
import Notify from "../../components/ui/Notify.mjs";

export async function updateAvatar() {
  if (!getState("token")) {
    Notify(`Please log in to update your avatar.`, { type: "warning", duration: 3000, dismissible: true });
    return false;
  }

  const fileInput = createElement("input", { type: "file", accept: "image/*", style: "display:none;" });
  document.body.appendChild(fileInput);
  fileInput.click();

  return new Promise((resolve) => {
    fileInput.addEventListener("change", async () => {
      if (!fileInput.files?.[0]) {
        document.body.removeChild(fileInput);
        return resolve(false);
      }

      const croppedBlob = await openCropper({ file: fileInput.files[0], type: "avatar" });
      document.body.removeChild(fileInput);
      if (!croppedBlob) {
return resolve(false);
}

      showLoadingMessage("Updating avatar picture...");
      try {
        const formData = new FormData();
        formData.append("avatar_picture", croppedBlob, "avatar.jpg");

        const response = await bannerFetch(`/api/v1/profile/avatar`, 'PUT', formData);
        if (!response?.avatar) {
throw new Error("No avatar returned from server.");
}

        const currentProfile = getState("userProfile") || {};
        setState({ userProfile: { ...currentProfile, avatar: response.avatar } }, true);

        Notify(`Avatar picture updated successfully.`, { type: "success", duration: 3000, dismissible: true });

        const preview = document.getElementById("avatar-picture-preview");
        if (preview) {
          preview.src = resolveImagePath(EntityType.USER, PictureType.THUMB, response.avatar) + `?t=${Date.now()}`;
        }

        resolve(true);
      } catch (err) {
        console.error("Error updating avatar picture:", err);
        handleError("Error updating avatar picture. Please try again.");
        resolve(false);
      } finally {
        removeLoadingMessage();
      }
    }, { once: true });
  });
}

export function createAvatar(profile) {
  const profileArea = createElement("div", { class: "profile_area" });
  const thumb = createElement("span", { class: "thumb" });

  const thumbSrc = resolveImagePath(EntityType.USER, PictureType.THUMB, `${profile.userid}.jpg`);
  const fullSrc = resolveImagePath(EntityType.USER, PictureType.PHOTO, profile.avatar);

  const img = new Image();
  img.src = thumbSrc;
  img.alt = "Profile Picture";
  img.loading = "lazy";
  img.onerror = () => {
 img.src = "/assets/icon-192.png"; 
};
  img.classList.add("imgful");

  thumb.appendChild(img);

  if (profile.avatar) {
thumb.addEventListener("click", () => SightBox(fullSrc, "image"));
}
  profileArea.appendChild(thumb);

  if (profile.userid === getState("user")) {
    const editBtn = createElement("button", { class: "edit-profile-pic" }, ["P"]);
    editBtn.addEventListener("click", () => updateAvatar());
    profileArea.appendChild(editBtn);
  }

  return profileArea;
}
