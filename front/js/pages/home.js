// import { YoHome } from "../services/home/yohome.js";
import { displayCrops } from "../services/crops/crop/crops.js";

function Home(isLoggedIn, container) {
    displayCrops(container, isLoggedIn);
    //   YoHome(isLoggedIn, container);
}

export { Home };
