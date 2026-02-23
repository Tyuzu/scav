import { getState, setState } from "../../state/state.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import { handleError } from "../../utils/utils.js";
import Notify from "../../components/ui/Notify.mjs";
import Bannerx from "../../components/base/Bannerx.js";

export async function updateBanner() {
  const profile = getState("userProfile");
  if (!profile?.userid) {
    handleError("No user profile found. Cannot update banner.");
    return false;
  }

  try {
    const response = await updateImageWithCrop({
      entityType: EntityType.USER,
      imageType: "banner",
      stateKey: "banner",
      stateEntityKey: "user",
      previewElementId: "banner-picture-preview",
      pictureType: PictureType.BANNER,
      entityId: profile.userid
    });

    if (!response?.banner) throw new Error("No banner returned from server.");

    const currentProfile = getState("userProfile") || {};
    setState({ userProfile: { ...currentProfile, banner: response.banner } }, true);

    Notify(`${capitalize("banner")} updated successfully.`, { type: "success", duration: 3000, dismissible: true });

    const preview = document.getElementById("banner-picture-preview");
    if (preview) preview.src = resolveImagePath(EntityType.USER, PictureType.BANNER, response.banner) + `?t=${Date.now()}`;

    return true;
  } catch (err) {
    console.error("Error updating banner:", err);
    handleError("Error updating banner. Please try again.");
    return false;
  }
}

export function createBanner(profile, isCreator) {
  return Bannerx({
    isCreator,
    bannerkey: profile.banner,
    banneraltkey: `Banner for ${profile.username || "User"}`,
    bannerentitytype: EntityType.USER,
    stateentitykey: "user",
    bannerentityid: profile.userid
  });
}
