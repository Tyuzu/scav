import { getState } from "../../state/state.js";
import { formatDate } from "./profileHelpers.js";
import { logout } from "../auth/authService.js";
import { reportPost } from "../reporting/reporting.js";
import Button from "../../components/base/Button.js";

import { toggleAction } from "../beats/toggleFollows.js";
import { meChat } from "../mechat/plugnplay.js";
// import {userChatInit} from "../chats/chatPage.js";

// Reuse appendChildren from profileImages.js or redefine here if needed
function appendChildren(parent, ...children) {
    children.forEach(child => {
        if (child instanceof Node) {
            parent.appendChild(child);
        } else {
            console.error("Invalid child passed to appendChildren:", child);
        }
    });
}

function createProfileDetails(profile, isLoggedIn) {
    const profileDetails = document.createElement("div");
    profileDetails.className = "profile-details";

    const username = document.createElement("strong");
    username.className = "username";
    username.textContent = `@${profile.username}`;

    const name = document.createElement("p");
    name.className = "name";
    name.textContent = profile.name || "";

    const bio = document.createElement("p");
    bio.className = "bio";
    bio.textContent = profile.bio || "";

    const profileActions = createProfileActions(profile, isLoggedIn);
    const profileInfo = createProfileInfo(profile);

    appendChildren(profileDetails, profileActions, name, username, bio, profileInfo);
    return profileDetails;
}



/**
 * Follow a user
 */
function FollowUser(followBtn, userId) {
    toggleAction({
        entityId: userId,
        entityType: "user",
        button: followBtn,
        apiPath: "/subscribes/",
        labels: { on: "Unfollow", off: "Follow" },
        actionName: "followed"
    });
}



function createProfileActions(profile, isLoggedIn) {
    const profileActions = document.createElement("div");
    profileActions.className = "profile-actions";

    if (profile.userid === getState("user")) {
        const logoutButton = document.createElement("button");
        logoutButton.className = "dropdown-item logout-btn";
        logoutButton.textContent = "Logout";
        logoutButton.addEventListener("click", async () => await logout());
        profileActions.appendChild(logoutButton);

        const editButton = document.createElement("button");
        editButton.className = "btn edit-btn";
        editButton.dataset.action = "edit-profile";
        editButton.textContent = "Edit Profile";
        profileActions.appendChild(editButton);
    }


    const currentUser = getState("user");

    // Profile Actions (Follow, Message, Report)
    if (isLoggedIn && profile.userid !== currentUser) {
        const followButton = Button(
            profile.is_following ? "Unfollow" : "Follow",
            "follow-btn",
            {
                // click: () => toggleFollow(profile.userid, followButton, profile)
                click: () => FollowUser(followButton, profile.userid)
            },
            "btn follow-button",
            { backgroundColor: "lightgreen" }
        );

        followButton.dataset.action = "toggle-follow";
        followButton.dataset.userid = profile.userid;
        profileActions.appendChild(followButton);

        const sendMessagebtn = Button(
            "Send Message",
            "send-msg",
            {
                click: () => meChat(profile.userid, "user", currentUser)
            },
            "buttonx"
        );
        profileActions.appendChild(sendMessagebtn);

        const reportButton = Button(
            "Report",
            "report-btn",
            {
                click: () => {
 reportPost(profile.userid, "user"); 
}
            },
            "report-btn",
            { backgroundColor: "#ee9090" }
        );
        profileActions.appendChild(reportButton);
    }

    return profileActions;
}

function createProfileInfo(profile) {
    const profileInfo = document.createElement("div");
    profileInfo.className = "profile-info";
  
    const infoItems = [
      { label: "Last Login", value: formatDate(profile.last_login) || "Never logged in" },
      { label: "Verification Status", value: profile.is_verified ? "Verified" : "Not Verified" },
    ];
  
    infoItems.forEach(({ label, value }) => {
      const infoItem = document.createElement("div");
      infoItem.className = "info-item";
  
      const strongLabel = document.createElement("strong");
      strongLabel.textContent = label + ":";
      infoItem.appendChild(strongLabel);
  
      // If value is a DOM element, append it; otherwise, append text
      if (value instanceof Node) {
        infoItem.appendChild(document.createTextNode(" "));
        infoItem.appendChild(value);
      } else {
        infoItem.appendChild(document.createTextNode(" " + value));
      }
  
      profileInfo.appendChild(infoItem);
    });
  
    return profileInfo;
  }
  
  
function createStatistics(profile) {
    const statistics = document.createElement("div");
    statistics.className = "statistics";

    const stats = [
        { label: "Posts", value: profile.profile_views || 0 },
        { label: "Followers", value: profile.followerscount || 0 },
        { label: "Following", value: profile.followscount || 0 },
    ];

    stats.forEach(({ label, value }) => {
        const statItem = document.createElement("p");
        statItem.className = "hflex";

        const strong = document.createElement("strong");
        strong.textContent = value;

        const labelSpan = document.createTextNode(" " + label);

        statItem.appendChild(strong);
        statItem.appendChild(labelSpan);
        statistics.appendChild(statItem);
    });

    return statistics;
}

export {
    createProfileDetails,
    createProfileActions,
    createProfileInfo,
    createStatistics,
    appendChildren
};
