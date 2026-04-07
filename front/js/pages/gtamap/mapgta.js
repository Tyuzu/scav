import { createElement } from "../../components/createElement";
import { displayGtaMap } from "../../services/GTAmap/gtamap";

async function MapGTA(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    const mapcon = createElement("div", { class: "mapcon" }, []);
    contentContainer.appendChild(mapcon);
    displayGtaMap(mapcon, isLoggedIn);
}

export { MapGTA };
