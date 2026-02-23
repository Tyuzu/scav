import { createElement } from "../../../components/createElement";


export function renderWeatherDetails() {
    return createElement("section", { class: "info-widget" }, [
        createElement("div", { class: "weather-main" }, [
            createElement("span", { class: "weather-icon" }, ["🌤️"]),
            createElement("span", { class: "temperature" }, ["28.6°C Air"]),
        ]),
        createElement("div", { class: "location" }, ["Farm — NYC"]),
        createElement("div", { class: "weather-extra" }, [
            createElement("span", { class: "humidity" }, ["💧 Humidity: 65%"]),
            createElement("span", { class: "wind" }, ["🌬️ Wind: 12 km/h"]),
            createElement("span", { class: "soil-temp" }, ["🌱 Soil: 22.3°C"]),
            createElement("span", { class: "rain" }, ["🌧️ Rain: 2mm (next 24h)"]),
        ]),
    ]);
}
