// components/notifications/preferencesModal.js
import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import notificationService from "../../services/notificationService.js";

export async function openNotificationPreferencesModal() {
    let userId = null;
    let preferences = {
        mentionsEnabled: true,
        followsEnabled: true,
        commentsEnabled: true,
        likesEnabled: true,
        messagesEnabled: true,
        allEnabled: true
    };

    // Get current user ID
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            userId = user.id || user._id;
        }
    } catch (e) {
        console.error("Failed to get user ID from storage", e);
    }

    // Fetch existing preferences
    if (userId) {
        try {
            preferences = await notificationService.getPreferences(userId);
        } catch (error) {
            console.error("Failed to fetch preferences", error);
        }
    }

    const content = createElement("div", {
        style: `
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            padding: 1rem;
        `
    });

    // Toggle All
    const toggleAllContainer = createElement("div", {
        style: `
            padding: 1rem;
            background: #f0f0f0;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        `
    });

    toggleAllContainer.appendChild(
        createElement("label", {
            style: `
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
                font-weight: 600;
            `
        }, [
            createElement("input", {
                type: "checkbox",
                checked: preferences.allEnabled,
                style: "cursor: pointer; width: 1.2rem; height: 1.2rem;",
                onchange: async (e) => {
                    const newValue = e.target.checked;
                    // Update all toggles visually
                    document.querySelectorAll(".notif-toggle").forEach(toggle => {
                        toggle.checked = newValue;
                    });
                    // Update enableAll checkbox
                    document.getElementById("enableAll").checked = newValue;
                    try {
                        if (userId) {
                            await notificationService.updatePreferences(userId, {
                                allEnabled: newValue
                            });
                        }
                    } catch (error) {
                        console.error("Failed to update preferences", error);
                    }
                },
                id: "enableAll"
            }),
            "Enable All Notifications"
        ])
    );

    content.appendChild(toggleAllContainer);

    // Individual settings
    const settingsContainer = createElement("div", {
        style: `
            display: flex;
            flex-direction: column;
            gap: 1rem;
        `
    });

    const settings = [
        {
            key: "mentionsEnabled",
            label: "Mentions",
            description: "Notify when someone mentions you",
            icon: "@"
        },
        {
            key: "followsEnabled",
            label: "Follows",
            description: "Notify when someone follows you",
            icon: "👥"
        },
        {
            key: "commentsEnabled",
            label: "Comments",
            description: "Notify when someone comments on your content",
            icon: "💬"
        },
        {
            key: "likesEnabled",
            label: "Likes",
            description: "Notify when someone likes your content",
            icon: "❤️"
        },
        {
            key: "messagesEnabled",
            label: "Direct Messages",
            description: "Notify when you receive messages",
            icon: "✉️"
        }
    ];

    settings.forEach(setting => {
        const toggleContainer = createElement("label", {
            style: `
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem 1rem;
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.2s;
            `
        });

        toggleContainer.addEventListener("mouseover", () => {
            toggleContainer.style.backgroundColor = "#f9f9f9";
        });
        toggleContainer.addEventListener("mouseout", () => {
            toggleContainer.style.backgroundColor = "#fff";
        });

        const checkbox = createElement("input", {
            type: "checkbox",
            checked: preferences[setting.key],
            class: "notif-toggle",
            style: "cursor: pointer; width: 1.2rem; height: 1.2rem; flex-shrink: 0;",
            onchange: async (e) => {
                try {
                    if (userId) {
                        const updateData = {};
                        updateData[setting.key] = e.target.checked;
                        await notificationService.updatePreferences(userId, updateData);
                    }
                } catch (error) {
                    console.error("Failed to update preference", error);
                }
            }
        });

        const textContent = createElement("div", {
            style: `
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                flex: 1;
            `
        });

        textContent.appendChild(
            createElement("strong", {
                style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;"
            }, [setting.icon + " " + setting.label])
        );

        textContent.appendChild(
            createElement("small", {
                style: "color: #666; font-size: 0.85rem;"
            }, [setting.description])
        );

        toggleContainer.appendChild(checkbox);
        toggleContainer.appendChild(textContent);
        settingsContainer.appendChild(toggleContainer);
    });

    content.appendChild(settingsContainer);

    // Info section
    const infoBox = createElement("div", {
        style: `
            padding: 0.75rem 1rem;
            background: #e8f4f8;
            border-left: 4px solid #17a2b8;
            border-radius: 4px;
            font-size: 0.85rem;
            color: #666;
        `
    }, [
        "💡 You can manage these settings anytime. Disable all notifications to silence them completely."
    ]);

    content.appendChild(infoBox);

    // Create modal
    const modal = new Modal({
        title: "🔔 Notification Preferences",
        content: content,
        size: "medium",
        showFooter: true,
        footerButtons: [
            {
                label: "Done",
                class: "btn-primary",
                onclick: () => {
                    modal.close();
                }
            }
        ]
    });

    modal.open();
}
