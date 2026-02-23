import { fetchUserProfile } from "./fetchProfile.js";
import profilGen from "./renderUserProfile.js";
import {attachProfileEventListeners} from "./userProfileService.js";
// import {displayFollowSuggestions} from "./displayFollowSugg.js";
import {displayUserProfileData} from "../userdata/displayProfileData.js";
import Notify from "../../components/ui/Notify.mjs";

async function displayUserProfile(isLoggedIn, content, username) {
    // const content = document.getElementById("content");
    // content.textContent = ""; // Clear existing content

    console.log("profile");
    try {
        const userProfile = await fetchUserProfile(username);

        console.log(userProfile);

        if (userProfile) {
            const profileElement = profilGen(userProfile, isLoggedIn);
            content.appendChild(profileElement);
            attachProfileEventListeners(content);
            // displayFollowSuggestions(userProfile.userid,);
        } else {
            const notFoundMessage = document.createElement("p");
            notFoundMessage.textContent = "User not found.";
            content.appendChild(notFoundMessage);
        }
    } catch (error) {
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Failed to load user profile. Please try again later.";
        content.appendChild(errorMessage);


        Notify("Error fetching user profile.", {type:"error",duration:3000, dismissible:true});
    }
}


export { displayUserProfile, displayUserProfileData };
