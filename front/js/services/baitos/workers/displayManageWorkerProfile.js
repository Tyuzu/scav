/* Worker's Interface - Manage own worker profile */
import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { apiFetch } from "../../../api/api.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { navigate } from "../../../routes/index.js";
import Imagex from "../../../components/base/Imagex.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import { displayCreateOrEditBaitoProfile } from "../create/createBaitoProfile.js";
import Notify from "../../../components/ui/Notify.mjs";
import { createTabs } from "../../../components/ui/createTabs.js";

export async function displayManageWorkerProfile(contentContainer, isLoggedIn, workerId) {
    const container = createElement("div", { id: "manage-worker-profile-page", class: "manage-worker-profile-page" });
    container.appendChild(createElement("p", { class: "loading-msg" }, ["⏳ Loading profile..."]));
    contentContainer.replaceChildren(container);

    let worker = null;
    try {
        worker = await apiFetch(`/baitos/worker/${workerId}`);
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
        container.replaceChildren(createElement("p", { class: "error-msg" }, ["⚠️ Failed to load profile."]));
        return;
    }

    const layout = createElement("div", { class: "manage-profile-layout" });
    const main = createElement("div", { class: "manage-profile-main" });

    // ===== HEADER =====
    const header = createElement("section", { class: "profile-header card" }, [
        createEditableWorkerPhoto(worker),
        createElement("div", { class: "header-content" }, [
            createElement("h2", {}, [worker.name || "Your Worker Profile"]),
            createElement("p", { class: "profile-id" }, [`Worker ID: ${worker.baitoUserId}`]),
            createElement("p", { class: "joined-date" }, [`Joined: ${formatDate(worker.createdAt)}`])
        ])
    ]);

    // ===== TABS =====
    const tabsConfig = [
        {
            id: "overview",
            title: "Overview",
            render: (container) => {
                container.replaceChildren(createSectionCard("Profile Summary", [
                    renderDetail("👤", "Name", worker.name),
                    renderDetail("📞", "Phone", worker.phone),
                    renderDetail("📍", "Location", worker.location),
                    renderDetail("🎯", "Specialties", worker.preferredRoles),
                    renderDetail("📝", "Bio", worker.bio ? worker.bio.substring(0, 100) + "..." : "No bio"),
                    createElement("div", { class: "action-buttons" }, [
                        Button("✏️ Edit", "", { click: () => editProfile() }, "secondary"),
                        Button("🖼️ Update Photo", "", { click: () => updatePhoto() }, "secondary")
                    ])
                ]));
            }
        },
        {
            id: "details",
            title: "Details",
            render: (container) => {
                container.replaceChildren(
                    createSectionCard("Contact Information", [
                        renderDetail("📞", "Phone", worker.phone),
                        renderDetail("✉️", "Email", worker.email),
                        renderDetail("📍", "Location", worker.location)
                    ]),
                    createSectionCard("Professional", [
                        renderDetail("⭐", "Experience", worker.experience),
                        renderDetail("🛠️", "Skills", worker.skills),
                        renderDetail("🌐", "Languages", worker.languages),
                        renderDetail("💰", "Expected Wage", worker.expectedWage ? `${worker.expectedWage} ¥/hr` : "Not set"),
                        renderDetail("💼", "Availability", worker.availability)
                    ]),
                    worker.bio && createSectionCard("About", [
                        createElement("p", { class: "bio-text" }, [worker.bio])
                    ])
                );
            }
        },
        {
            id: "documents",
            title: "Documents",
            render: (container) => {
                if (worker.documents?.length) {
                    container.replaceChildren(
                        createSectionCard("Your Documents", [
                            createElement("ul", { class: "document-list" }, worker.documents.map((doc, i) =>
                                createElement("li", {}, [
                                    createElement("a", {
                                        href: resolveImagePath(EntityType.WORKER, PictureType.DOCUMENT, doc),
                                        target: "_blank"
                                    }, [`📄 Document ${i + 1}`])
                                ])
                            )),
                            Button("📤 Upload Documents", "", { click: () => uploadDocuments() }, "secondary")
                        ])
                    );
                } else {
                    container.replaceChildren(
                        createSectionCard("Documents", [
                            createElement("p", { class: "empty-state" }, ["No documents uploaded yet"]),
                            Button("📤 Upload Documents", "", { click: () => uploadDocuments() }, "primary")
                        ])
                    );
                }
            }
        },
        {
            id: "bookings",
            title: "Bookings",
            render: (container) => loadWorkerBookings(worker.baitoUserId, container)
        },
        {
            id: "settings",
            title: "Settings",
            render: (container) => {
                container.replaceChildren(createSectionCard("Manage Profile", [
                    createElement("div", { class: "settings-section" }, [
                        createElement("h4", {}, ["Profile Management"]),
                        Button("✏️ Edit Full Profile", "", { click: () => editProfile() }, "secondary"),
                        Button("📸 Update Photo", "", { click: () => updatePhoto() }, "secondary"),
                        Button("🖼️ Manage Gallery", "", { click: () => manageGallery() }, "secondary")
                    ]),
                    createElement("div", { class: "settings-section danger" }, [
                        createElement("h4", {}, ["Danger Zone"]),
                        Button("🗑️ Delete Profile", "", {
                            click: async () => {
                                if (!window.confirm("Are you sure? This cannot be undone.")) {
                                    return;
                                }
                                try {
                                    Notify("Deleting profile...", { type: "info" });
                                    await apiFetch(`/baitos/worker/${worker.baitoUserId}`, "DELETE");
                                    Notify("Profile deleted.", { type: "success" });
                                    navigate("/baitos/hire");
                                } catch (err) {
                                    Notify("Failed to delete: " + (err.message || "Unknown error"), { type: "error" });
                                }
                            }
                        }, "danger")
                    ])
                ]));
            }
        }
    ];

    // ===== ACTION HANDLERS =====
    function editProfile() {
        contentContainer.replaceChildren();
        displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "edit", worker.baitoUserId);
    }

    function updatePhoto() {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "photo",
            stateKey: "profilePic",
            stateEntityKey: "worker",
            previewElementId: "worker-avatar-img",
            pictureType: PictureType.PHOTO,
            entityId: worker.baitoUserId
        });
    }

    function manageGallery() {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "gallery",
            stateKey: "images",
            stateEntityKey: "worker",
            previewElementId: null,
            pictureType: PictureType.GALLERY,
            entityId: worker.baitoUserId
        });
    }

    function uploadDocuments() {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "document",
            stateKey: "documents",
            stateEntityKey: "worker",
            previewElementId: null,
            pictureType: PictureType.DOCUMENT,
            entityId: worker.baitoUserId
        });
    }

    const tabsContainer = createTabs(tabsConfig, `worker-profile-${worker.baitoUserId}`, "overview");

    main.replaceChildren(header, tabsContainer);
    layout.appendChild(main);
    container.replaceChildren(layout);
}

// ===== HELPERS =====

function createEditableWorkerPhoto(worker) {
    const container = createElement("div", { class: "editable-photo-wrapper" });
    const img = Imagex({
        id: "worker-avatar-img",
        src: resolveImagePath(EntityType.WORKER, PictureType.PHOTO, worker.profilePic),
        alt: worker.name,
        classes: "worker-profile-photo"
    });
    container.appendChild(img);

    return container;
}

function createSectionCard(title, children) {
    return createElement("div", { class: "profile-section card" }, [
        title && createElement("h3", {}, [title]),
        ...children.filter(Boolean)
    ].filter(Boolean));
}

function renderDetail(icon, label, value) {
    if (!value) {
        return null;

    }
    return createElement("div", { class: "detail-row" }, [
        createElement("span", { class: "detail-icon" }, [icon]),
        createElement("span", { class: "detail-label" }, [label + ":"]),
        createElement("span", { class: "detail-value" }, [
            Array.isArray(value) ? value.join(", ") : String(value)
        ])
    ]);
}

async function loadWorkerBookings(workerId, container) {
    try {
        const res = await apiFetch(`/bookings/bookings?entityType=worker&entityId=${workerId}`);
        const bookings = res.bookings || [];

        if (!bookings.length) {
            container.replaceChildren(
                createSectionCard("Bookings", [
                    createElement("p", { class: "empty-state" }, ["No bookings yet"])
                ])
            );
            return;
        }

        const upcoming = bookings.filter(b => new Date(`${b.date}T${b.start}`) >= new Date());
        const past = bookings.filter(b => new Date(`${b.date}T${b.start}`) < new Date());

        container.replaceChildren(
            ...[
                upcoming.length > 0 && createSectionCard("Upcoming", [
                    createElement("ul", { class: "booking-list" }, upcoming.map(b =>
                        createElement("li", { class: `booking-item status-${b.status}` }, [
                            `${b.date} @ ${b.start} - ${b.start || "TBD"} (${b.status})`
                        ])
                    ))
                ]),
                past.length > 0 && createSectionCard("Past Bookings", [
                    createElement("ul", { class: "booking-list past" }, past.map(b =>
                        createElement("li", { class: `booking-item status-${b.status}` }, [
                            `${b.date} @ ${b.start} (${b.status})`
                        ])
                    ))
                ])
            ].filter(Boolean)
        );
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
        container.replaceChildren(
            createSectionCard("Bookings", [
                createElement("p", { class: "error-state" }, ["Failed to load bookings"])
            ])
        );
    }
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "Unknown";

    }
    const date = new Date(typeof timestamp === "number" ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString();
}
