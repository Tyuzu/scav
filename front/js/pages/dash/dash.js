import { displayDash } from "../../services/dashboards/farmDash.js";
// import { displayDash } from "../../services/dashboards/dashboard.js";

async function Dash(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayDash(contentContainer, isLoggedIn);
}

export { Dash };
