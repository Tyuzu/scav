
import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement.js";

export async function displayAboutCrop(contentContainer, cropID, isLoggedIn) {
    contentContainer.textContent = "";

    const wrapper = createElement("div", { class: "crop-about-wrapper" }, [
        createHeaderSection("Tomato", "Solanum lycopersicum"),
        createImageSection("/static/images/tomato.jpg", "A ripe tomato on vine"),
        createDescriptionSection(),
        createNutritionalSection(),
        createGrowingConditionsSection(),
        createPlantingHarvestingSection(),
        createCareSection(),
        createVarietiesSection(),
        createUsageSection(),
        createFunFactsSection()
    ]);

    contentContainer.appendChild(wrapper);
}

function createHeaderSection(common, scientific) {
    return createElement("section", { class: "crop-header" }, [
        createElement("h1", {}, [common]),
        createElement("h3", { class: "crop-scientific" }, [scientific])
    ]);
}

function createImageSection(src, alt) {
    const img = Imagex( {
        src,
        alt,
        clasess: "crop-main-image",
        loading: "lazy"
    });
    return createElement("section", { class: "crop-image-section" }, [img]);
}

function createDescriptionSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Description"]),
        createElement("p", {}, [
            "Tomatoes are warm-season annuals native to western South America. They are grown for their edible fruits, which are rich in vitamin C and antioxidants. Tomatoes grow on vines and come in a variety of colors including red, yellow, and purple."
        ])
    ]);
}

function createNutritionalSection() {
    const list = createElement("ul", {}, [
        createElement("li", {}, ["Calories: 18 kcal"]),
        createElement("li", {}, ["Water: 95%"]),
        createElement("li", {}, ["Vitamin C: 13.7 mg"]),
        createElement("li", {}, ["Potassium: 237 mg"]),
        createElement("li", {}, ["Lycopene: High"])
    ]);
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Nutritional Value (per 100g)"]),
        list
    ]);
}

function createGrowingConditionsSection() {
    const table = createElement("table", { class: "crop-table" }, [
        createElement("tr", {}, [
            createElement("th", {}, ["Soil"]),
            createElement("td", {}, ["Well-drained, loamy"])
        ]),
        createElement("tr", {}, [
            createElement("th", {}, ["Sunlight"]),
            createElement("td", {}, ["Full sun (6–8 hrs)"])
        ]),
        createElement("tr", {}, [
            createElement("th", {}, ["Water"]),
            createElement("td", {}, ["Moderate, consistent"])
        ]),
        createElement("tr", {}, [
            createElement("th", {}, ["Temperature"]),
            createElement("td", {}, ["20°C – 30°C"])
        ])
    ]);
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Ideal Growing Conditions"]),
        table
    ]);
}

function createPlantingHarvestingSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Planting & Harvesting"]),
        createElement("p", {}, [
            "Plant tomato seeds indoors 6–8 weeks before the last frost. Transplant outdoors when seedlings are 15cm tall. Harvest typically begins 60–85 days after planting, when fruits are fully colored and slightly soft to touch."
        ])
    ]);
}

function createCareSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Care & Maintenance"]),
        createElement("ul", {}, [
            createElement("li", {}, ["Use compost-rich soil for optimal growth."]),
            createElement("li", {}, ["Stake or cage the plants to support vines."]),
            createElement("li", {}, ["Watch for blight and aphids."]),
            createElement("li", {}, ["Rotate crops yearly to prevent disease."])
        ])
    ]);
}

function createVarietiesSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Varieties"]),
        createElement("ul", {}, [
            createElement("li", {}, ["Roma"]),
            createElement("li", {}, ["Cherry"]),
            createElement("li", {}, ["Beefsteak"]),
            createElement("li", {}, ["Heirloom"])
        ])
    ]);
}

function createUsageSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Usage"]),
        createElement("p", {}, [
            "Tomatoes are used in sauces, salads, soups, juices, and condiments. They are also processed into ketchup, puree, and sun-dried forms. Medicinally, they are known for antioxidant properties."
        ])
    ]);
}

function createFunFactsSection() {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Fun Facts"]),
        createElement("ul", {}, [
            createElement("li", {}, ["Tomatoes were once thought to be poisonous."]),
            createElement("li", {}, ["China is the world's largest tomato producer."]),
            createElement("li", {}, ["Tomatoes are technically berries."])
        ])
    ]);
}
