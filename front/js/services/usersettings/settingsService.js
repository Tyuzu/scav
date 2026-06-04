import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import ToggleSwitch from "../../components/ui/ToggleSwitch.mjs";

function createContainer() {
    const container = document.createElement("div");
    container.id = "settings-container";
    return container;
}

function createLoadingIndicator() {
    const loading = document.createElement("div");
    loading.className = "settings-loading";
    loading.textContent = "Loading settings...";
    return loading;
}

function createErrorContainer() {
    const error = document.createElement("div");
    error.className = "settings-error";
    return error;
}

function showToast(message, isError = false) {
    const toast = document.createElement("div");

    toast.className = isError
        ? "settings-toast error"
        : "settings-toast success";

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

async function updateSetting(type, value) {
    try {
        const response = await apiFetch(
            "/settings",
            "PATCH",
            {
                [type]: value,
            }
        );

        if (!response || response.status !== "success") {
            throw new Error("Update failed");
        }

        showToast("Saved");
    } catch (error) {
        console.error(error);
        showToast("Failed to save", true);
    }
}

function createToggle(setting, value) {
    const toggle = ToggleSwitch((checked) => {
        updateSetting(setting.type, checked);
    });

    const input = toggle.querySelector("input");

    if (input) {
        input.checked = Boolean(value);
    }

    return toggle;
}

function createSelect(setting, value) {
    const select = document.createElement("select");

    (setting.options || []).forEach((option) => {
        const el = document.createElement("option");

        el.value = option;
        el.textContent =
            option.charAt(0).toUpperCase() +
            option.slice(1);

        if (option === value) {
            el.selected = true;
        }

        select.appendChild(el);
    });

    select.addEventListener("change", () => {
        updateSetting(setting.type, select.value);
    });

    return select;
}

function createTime(setting, value) {
    const input = document.createElement("input");

    input.type = "time";
    input.value = value || "";

    input.addEventListener("change", () => {
        updateSetting(setting.type, input.value);
    });

    return input;
}

function createNumber(setting, value) {
    const input = document.createElement("input");

    input.type = "number";
    input.value = value ?? 0;

    input.addEventListener("change", () => {
        updateSetting(
            setting.type,
            Number(input.value)
        );
    });

    return input;
}

function createText(setting, value) {
    const input = document.createElement("input");

    input.type = "text";
    input.value = value || "";

    input.addEventListener("blur", () => {
        updateSetting(
            setting.type,
            input.value
        );
    });

    return input;
}

function createControl(setting, value) {
    switch (setting.control) {
        case "toggle":
            return createToggle(setting, value);

        case "select":
            return createSelect(setting, value);

        case "time":
            return createTime(setting, value);

        case "number":
            return createNumber(setting, value);

        default:
            return createText(setting, value);
    }
}

function createSettingCard(setting, value) {
    const card = document.createElement("div");
    card.className = "setting-card";

    const info = document.createElement("div");
    info.className = "setting-info";

    const title = document.createElement("h3");
    title.textContent = setting.label;

    const description = document.createElement("p");
    description.textContent = setting.description;

    info.append(
        title,
        description
    );

    const control = document.createElement("div");
    control.className = "setting-control";

    control.appendChild(
        createControl(setting, value)
    );

    card.append(
        info,
        control
    );

    return card;
}

function renderSettings(
    container,
    schema,
    values
) {
    const categories = {};

    schema.forEach((setting) => {
        const category =
            setting.category || "General";

        if (!categories[category]) {
            const section =
                document.createElement("section");

            section.className =
                "settings-category";

            const heading =
                document.createElement("h2");

            heading.textContent =
                category;

            const body =
                document.createElement("div");

            body.className =
                "settings-category-body";

            section.append(
                heading,
                body
            );

            container.appendChild(
                section
            );

            categories[category] =
                body;
        }

        categories[category]
            .appendChild(
                createSettingCard(
                    setting,
                    values[
                        setting.type
                    ]
                )
            );
    });
}

async function loadSettings() {
    const [schema, values] =
        await Promise.all([
            apiFetch(
                "/settings/schema"
            ),
            apiFetch("/settings"),
        ]);

    return {
        schema,
        values,
    };
}

async function displaySettings(
    isLoggedIn,
    settingsSec
) {
    if (!isLoggedIn) {
        navigate("/login");
        return;
    }

    const container =
        createContainer();

    const loading =
        createLoadingIndicator();

    const error =
        createErrorContainer();

    container.append(
        loading,
        error
    );

    settingsSec.replaceChildren(
        container
    );

    try {
        const {
            schema,
            values,
        } = await loadSettings();

        container.replaceChildren();

        renderSettings(
            container,
            schema,
            values
        );
    } catch (err) {
        console.error(err);

        error.textContent =
            err.message ||
            "Failed to load settings";

        container.replaceChildren(
            error
        );
    }
}

export {
    displaySettings,
};