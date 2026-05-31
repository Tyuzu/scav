// profileAvatar.js

import { getState, setState } from "../../state/state.js";
import {
    resolveImagePath,
    EntityType,
    PictureType
} from "../../utils/imagePaths.js";
import { createElement } from "../../components/createElement.js";
import { handleError } from "../../utils/utils.js";
import SightBox from "../../components/ui/SightBox.mjs";
import Notify from "../../components/ui/Notify.mjs";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";

/* ============================================================
   UPDATE AVATAR
============================================================ */

export async function updateAvatar() {
    const profile = getState("userProfile");

    if (!profile?.userid) {
        handleError(
            "No user profile found. Cannot update avatar."
        );
        return false;
    }

    try {
        const response = await updateImageWithCrop({
            entityType: EntityType.USER,
            imageType: "avatar",
            stateKey: "avatar",
            previewElementId: "avatar-picture-preview",
            pictureType: PictureType.THUMB,
            entityId: profile.userid
        });

        if (!response) {
            return false;
        }

        const attachments = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : [];

        const avatarAttachment = attachments.find(
            attachment =>
                (attachment.key || attachment.Key) === "avatar"
        );

        if (!avatarAttachment) {
            throw new Error(
                "No avatar returned from server."
            );
        }

        const currentProfile =
            getState("userProfile") || {};

        setState(
            {
                userProfile: {
                    ...currentProfile,
                    avatar: avatarAttachment.filename
                }
            },
            true
        );

        Notify(
            "Avatar updated successfully.",
            {
                type: "success",
                duration: 3000,
                dismissible: true
            }
        );

        return true;

    } catch (err) {
        console.error(
            "Error updating avatar:",
            err
        );

        handleError(
            "Error updating avatar. Please try again."
        );

        return false;
    }
}

/* ============================================================
   AVATAR COMPONENT
============================================================ */

export function createAvatar(profile) {
    const profileArea = createElement(
        "div",
        {
            class: "profile_area"
        }
    );

    const thumb = createElement(
        "span",
        {
            class: "thumb"
        }
    );

    const thumbSrc = resolveImagePath(
        EntityType.USER,
        PictureType.THUMB,
        `${profile.avatar}`
    );

    const fullSrc = resolveImagePath(
        EntityType.USER,
        PictureType.PHOTO,
        profile.avatar
    );

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
        thumb.addEventListener(
            "click",
            () => SightBox(fullSrc, "image")
        );
    }

    profileArea.appendChild(thumb);

    if (
        profile.userid === getState("user")
    ) {
        const editBtn = createElement(
            "button",
            {
                class: "edit-profile-pic"
            },
            ["P"]
        );

        editBtn.addEventListener(
            "click",
            updateAvatar
        );

        profileArea.appendChild(
            editBtn
        );
    }

    return profileArea;
}