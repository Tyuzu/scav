import { createPromoLink } from "./displayCropshelpers";
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";

export function cropAside(cropData) {
    return createElement("div", "", [
        createElement("h3", {}, ["Actions"]),
        createElement("div", { class: "cta-list" }, [
            Button("Buy Products","buyprds-crp-btn",{
                click: () => {
navigate('/products')
}
            }, "action-btn buttonx", {"margin-right":"4px"}),
            Button("See Recipes","recipes-crp-btn",{
                click: () => {
navigate('/recipes')
}
            }, "buttonx secondary"),
            Button("List Your Farm","newfrm-btn",{
                click: () => {
navigate('/create-farm')
}
            }, "buttonx secondary", {"margin-right":"4px"}),
        ]),

        // createElement("h3", {}, ["🌟 Featured Crops"]),
        // createElement("div", { class: "featured-list" }, []),

        // createElement("h3", {}, ["💸 Deals"]),
        // createElement("div", { class: "promo-box" }, [
        //     createPromoLink("🧃 Buy 2 kg Tomatoes, get 10% off!", "Tomato", cropData),
        //     createPromoLink("🥭 Fresh Mangoes now ₹40/kg!", "Mango", cropData)
        // ]),

        // createElement("h3", {}, ["📅 Seasonal Picks"]),
        // createElement("div", { class: "promo-box" }, [
        //     createElement("p", {}, ["🍉 Watermelons are ripe this week"]),
        //     createElement("p", {}, ["🌽 Baby corn harvest starting soon"])
        // ]),

        // createElement("h3", {}, ["🔔 Announcements"]),
        // // createElement("div", { class: "announcement-box" }, [
        // createElement("div", { class: "promo-box" }, [
        //     createElement("p", {}, ["🛠 Maintenance scheduled this Friday"]),
        //     createElement("p", {}, ["🚚 New delivery zones added in Karnal"])
        // ]),

        // createElement("h3", {}, ["📊 Crop Trends"]),
        // // createElement("div", { class: "trend-box" }, [
        // createElement("div", { class: "promo-box" }, [
        //     createElement("p", {}, ["📈 Onion prices up 12% this week"]),
        //     createElement("p", {}, ["📉 Cauliflower down due to surplus"])
        // ]),

        // createElement("h3", {}, ["📷 Farmer's Showcase"]),
        // // createElement("div", { class: "showcase-box" }, [
        // createElement("div", { class: "promo-box" }, [
        //     createElement("p", {}, ["🏞️ Featured: Ajay’s organic carrot patch"]),
        //     createElement("p", {}, ["🧑‍🌾 Share your crop stories!"])
        // ])
    ]);
}
