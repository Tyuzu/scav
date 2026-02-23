// manageMembers.js

import { apiFetch } from "../../api/api.js";
import { manageBandMembers } from "./createOrEditMembers.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import Notify from "../../components/ui/Notify.mjs";

export function renderBandMembers(artist, isCreator) {
    const cards = artist.members.map(member => {
        const photo = resolveImagePath(EntityType.ARTIST, PictureType.THUMB, member.image);
        const img = Imagex({ src: photo, alt: member.name, classes: "member-photo" });

        const info = createElement("div", { class: "member-info" }, [
            createElement("strong", {}, [member.name || ""]),
            createElement("span", {}, [member.role || ""]),
            // createElement("span", {}, [member.dob ? `DOB: ${member.dob}` : ""])
        ]);

        const children = [img, info];

        if (isCreator) {
            const controls = createUploadControls(member, artist, img);
            children.push(controls.uploadBtn, controls.fileInput);
        }

        return createElement("div", { class: "member-card" }, children);
    });

    return createElement("div", { class: "band-members" }, [
        createElement("p", {}, [createElement("strong", {}, ["👥 Band Members:"])]),
        createElement("div", { class: "member-grid" }, cards)
    ]);
}

export function createUploadControls(member, artist, img) {
    const fileInput = createElement("input", {
        type: "file",
        accept: "image/*",
        style: "display:none"
    });

    const uploadBtn = Button("P", "", {
        click: () => fileInput.click()
    }, "upload-member-btn edit-banner-pic");

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
            const uploaded = await uploadFile({
                mediaEntity: "artist",
                fileType: "member",
                id: uid(),
                file
            });

            await apiFetch(
                `/artists/${artist.artistid}/members/${member.artistid}`,
                "PUT",
                { image: uploaded.filename }
            );

            // Delay visual refresh
            setTimeout(() => {
                img.src =
                    resolveImagePath(EntityType.ARTIST, PictureType.THUMB, uploaded.filename) +
                    `?t=${Date.now()}`;
            }, 800);

            Notify(`${member.name}'s photo updated`, { type: "success", duration: 2500 });
        } catch (err) {
            Notify(`Failed to upload photo: ${err.message}`, { type: "error", duration: 2500 });
        }
    });

    return { uploadBtn, fileInput };
}

export function renderManageMembersButton(artistID, container) {
    return Button("👥 Manage Band Members", "", {
        click: () => {
            const ref = document.getElementById("editartist") || container;
            manageBandMembers(artistID, ref);
        }
    }, "manage-members-btn buttonx secondary");
}
