import { createElement } from "../../components/createElement";
import { displayGtaMap } from "../../services/GTAmap/gtamap";

async function MapGTA(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    let mapcon = createElement("div", { class: "mapcon" }, []);
    contentContainer.appendChild(mapcon);
    displayGtaMap(mapcon, isLoggedIn);
}

export { MapGTA };
