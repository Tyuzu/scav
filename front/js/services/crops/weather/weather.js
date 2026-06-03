import { apiFetch } from "../../../api/apiClient.js";
import { createElement } from "../../../components/createElement.js";

async function fetchWeather() {
    const res = await apiFetch("/weather");

    console.log(res);
    return res;
}

function renderContent(data) {
    return [
        createElement("div", { class: "weather-main" }, [
            createElement("span", { class: "weather-icon" }, [
                data.icon || "🌤️",
            ]),
            createElement("span", { class: "temperature" }, [
                `${data.airTemp}°C Air`,
            ]),
        ]),

        createElement("div", { class: "location" }, [
            data.location,
        ]),

        createElement("div", { class: "weather-extra" }, [
            createElement("span", { class: "humidity" }, [
                `💧 Humidity: ${data.humidity}%`,
            ]),

            createElement("span", { class: "wind" }, [
                `🌬️ Wind: ${data.windSpeed} km/h`,
            ]),

            createElement("span", { class: "soil-temp" }, [
                `🌱 Soil: ${data.soilTemp}°C`,
            ]),

            createElement("span", { class: "rain" }, [
                `🌧️ Rain: ${data.rain24h} mm`,
            ]),
        ]),
    ];
}

export function renderWeatherDetails() {
    const section = createElement("section", {
        class: "info-widget",
    });

    section.textContent = "Loading weather...";

    fetchWeather()
        .then((data) => {
            section.replaceChildren(...renderContent(data));
        })
        .catch(() => {
            section.textContent = "Unable to load weather";
        });

    return section;
}