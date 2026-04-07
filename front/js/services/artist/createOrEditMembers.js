// createOrEditMembers.js

import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/createFormGroup.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

// ENTRY
export async function manageBandMembers(artistID, container) {
    container.replaceChildren();

    const heading = createElement("h2", {}, ["Manage Band Members"]);
    const membersContainer = createElement("div", { id: "band-members-container" });

    const addBtn = Button(
        "Add Member",
        "add-member-btn",
        { click: () => addBandMember(null, membersContainer) },
        "buttonx",
        {}
    );

    const saveBtn = Button(
        "Save Members",
        "save-members-btn",
        { click: () => saveBandMembers(artistID, membersContainer) },
        "buttonx",
        {}
    );

    container.append(heading, membersContainer, addBtn, saveBtn);

    try {
        const artist = await apiFetch(`/artists/${artistID}`, "GET");
        (artist?.members || []).forEach(m =>
            addBandMember(m, membersContainer)
        );
    } catch {
        Notify("Failed to load members.", { type: "error", duration: 3000 });
    }
}

// SAVE ONLY CHANGES
async function saveBandMembers(artistID, container) {
    const rows = container.querySelectorAll(".band-member");

    for (const row of rows) {
        const status = row.dataset.status;
        const memberID = row.dataset.id;

        const name = row.querySelector("input[id^='member-name-']")?.value.trim() || "";
        const role = row.querySelector("input[id^='member-role-']")?.value.trim() || "";
        const dob  = row.querySelector("input[id^='member-dob-']")?.value || "";
        const image = row.querySelector("input[id^='member-image-']")?.value || "";

        if (!name && status !== "removed") {
            Notify("Member name is required.", { type: "warning", duration: 2000 });
            return;
        }

        if (status === "removed") {
            if (!memberID.startsWith("new-")) {
                await apiFetch(`/artists/${artistID}/members/${memberID}`, "DELETE");
            }
            continue;
        }

        if (status === "new") {
            await apiFetch(`/artists/${artistID}/members`, "POST", {
                name,
                role,
                dob,
                image
            });
            continue;
        }

        if (status === "updated") {
            await apiFetch(`/artists/${artistID}/members/${memberID}`, "PUT", {
                name,
                role,
                dob,
                image
            });
        }
    }

    Notify("Members updated.", { type: "success", duration: 2500 });
    navigate(`/artist/${artistID}`);
}

// ADD / EDIT MEMBER ROW
function addBandMember(existing, container) {
    if (!container) {
return;
}

    const data = existing || {};
    const memberID = data.memberid || `new-${crypto.randomUUID()}`;

    const memberDiv = createElement("div", {
        class: "band-member",
        "data-id": memberID,
        "data-status": existing ? "unchanged" : "new"
    });

    const refArtistField = createFormGroup({
        type: "text",
        id: `member-ref-${memberID}`,
        label: "Reference Artist ID (optional)",
        placeholder: "Paste artist ID to copy data",
        value: ""
    });

    const nameField = createFormGroup({
        type: "text",
        id: `member-name-${memberID}`,
        label: "Member Name",
        required: true,
        placeholder: "Member name",
        value: data.name || ""
    });

    const roleField = createFormGroup({
        type: "text",
        id: `member-role-${memberID}`,
        label: "Role (optional)",
        placeholder: "Role or instrument",
        value: data.role || ""
    });

    const dobField = createFormGroup({
        type: "date",
        id: `member-dob-${memberID}`,
        label: "DOB (optional)",
        value: data.dob || ""
    });

    // Hidden image field
    const imageField = createFormGroup({
        type: "hidden",
        id: `member-image-${memberID}`,
        value: data.image || ""
    });

    const markUpdated = () => {
        if (memberDiv.dataset.status === "unchanged") {
            memberDiv.dataset.status = "updated";
        }
    };

    memberDiv.addEventListener("input", markUpdated);

    const fetchBtn = Button(
        "Fetch Artist Data",
        "",
        {
            click: () =>
                fetchMemberData(
                    refArtistField,
                    nameField,
                    roleField,
                    dobField,
                    imageField,
                    memberDiv
                )
        },
        "",
        {}
    );

    const removeBtn = Button(
        "Remove",
        "",
        {
            click: () => {
                memberDiv.dataset.status = "removed";
                memberDiv.style.opacity = "0.4";
            }
        },
        "remove-member-btn buttonx",
        {}
    );

    const refRow = createElement(
        "div",
        { class: "member-id-row" },
        [refArtistField, fetchBtn]
    );

    memberDiv.append(
        refRow,
        nameField,
        roleField,
        dobField,
        imageField,
        removeBtn
    );

    container.append(memberDiv);
}

// FETCH ARTIST → COPY INTO MEMBER
async function fetchMemberData(refField, nameField, roleField, dobField, imageField, row) {
    const artistID = refField.querySelector("input")?.value.trim();

    if (!artistID) {
        Notify("Enter an artist ID first.", { type: "warning", duration: 2000 });
        return;
    }

    try {
        const artist = await apiFetch(`/artists/${artistID}`, "GET");

        if (!artist?.name) {
            Notify("Artist not found.", { type: "error", duration: 2000 });
            return;
        }

        nameField.querySelector("input").value = artist.name || "";
        dobField.querySelector("input").value = artist.dob || "";

        // Copy artist photo → member image
        const imgInput = imageField.querySelector("input");
        if (imgInput) {
            imgInput.value = artist.photo || "";
        }

        if (row.dataset.status === "unchanged") {
            row.dataset.status = "updated";
        }

        Notify("Artist data copied.", { type: "success", duration: 1500 });
    } catch {
        Notify("Failed to fetch artist.", { type: "error", duration: 3000 });
    }
}