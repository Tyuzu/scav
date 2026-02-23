import { SRC_URL, apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
// import { toggleFollow } from "./toggleFollow.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Notify from "../../components/ui/Notify.mjs";
import Imagex from "../../components/base/Imagex.js";

async function displayFollowSuggestions(userid, suggestionsSection) {
    suggestionsSection.replaceChildren(); // Clear previous content

    try {
        const suggestions = await apiFetch(`/suggestions/follow?userid=${userid}`);

        if (suggestions && suggestions.length > 0) {
            const heading = document.createElement("h3");
            heading.textContent = "Suggested Users to Follow:";
            suggestionsSection.appendChild(heading);

            const suggestionsList = document.createElement("div");
            suggestionsList.id = "suggestions-list";

            suggestions.forEach(user => {
                const listItem = document.createElement("div");
                listItem.className = "suggestion-item";

                // Profile Picture
                const profilePic = Imagex({
                    src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${user.userid}.jpg`),
                    class: "circle padd-4",
                });
                profilePic.alt = `${user.username}'s profile`;
                profilePic.setAttribute("loading", "lazy");
                
                // listItem.addEventListener("click", () => navigate(`/user/${user.username}`));

                // Username
                const username = document.createElement("span");
                username.className = "username";
                username.textContent = `@${user.username}`;

                // Bio
                const bio = document.createElement("span");
                bio.className = "bio";
                bio.textContent = user.bio;

                // // Follow Button
                // const followButton = document.createElement("button");
                // followButton.className = "follow-btn";
                // followButton.textContent = user.is_following ? "Following" : "Follow";
                // followButton.dataset.userid = user.userid;
                // // followButton.onclick = () => toggleFollow(user.userid, followButton, profile);
                
                // Follow Button
                const followButton = document.createElement("button");
                followButton.className = "follow-btn";
                followButton.textContent = "View Profile";
                followButton.dataset.userid = user.userid;
                followButton.addEventListener("click", () => navigate(`/user/${user.username}`));

                
                // Append elements
                listItem.appendChild(profilePic);
                listItem.appendChild(username);
                listItem.appendChild(bio);
                listItem.appendChild(followButton);
                suggestionsList.appendChild(listItem);
            });

            suggestionsSection.appendChild(suggestionsList);
        } else {
            const noSuggestionsMessage = document.createElement("p");
            // noSuggestionsMessage.textContent = "No follow suggestions available.";
            noSuggestionsMessage.textContent = "";
            suggestionsSection.appendChild(noSuggestionsMessage);
        }
    } catch (error) {
        console.error("Error loading follow suggestions:", error);

        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Failed to load suggestions.";
        suggestionsSection.appendChild(errorMessage);

        Notify("Error loading follow suggestions.", {type:"error",duration:3000, dismissible:true});
    }
}

export { displayFollowSuggestions };
