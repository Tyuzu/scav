import { displayCreateBaitoProfile } from "../../services/baitos/create/createBaitoProfile.js";

async function CreateBaitoProfile(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayCreateBaitoProfile(isLoggedIn, contentContainer);
}

export { CreateBaitoProfile };
