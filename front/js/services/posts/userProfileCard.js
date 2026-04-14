import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { payViaStripe } from "../pay/pay.js";

import { getState } from "../../state/state.js";
import Imagex from "../../components/base/Imagex.js";
// import { fetchUserMeta } from "../../utils/usersMeta.js";

export async function userProfileCard(profile = {
    username: "Anonymous",
    bio: "This user hasn't added a bio yet.",
    avatarUrl: "default-avatar.png",
    postCount: 0,
    isFollowing: false,
    entityType: "user",    // "user" | "post"
    entityId: null,        // userId or postId
    entityName: "Anonymous" // username or post title
}) {
    const card = createElement("div", { class: "user-profile-card" });
    // const userx =  await fetchUserMeta([profile.username]);
    // profile.username = userx[profile.username]?.username || "Anonymous"
    const avatar = Imagex({
        src: profile.avatarUrl,
        alt: `${profile.username}'s avatar`,
        classes: "avatar",
        loading: "lazy"
    });

    const name = createElement("h3", {}, [profile.username]);
    const bio = createElement("p", { class: "bio" }, [profile.bio]);

    const elements = [avatar, name, bio];

    const currentUser = getState("user");

    // Funding button (only if not the logged-in user)
    if (profile.username !== currentUser) {
        const fundButton = Button(
          "Fund",
          "fund-btn",
          {
            click: async () => {
              if (!profile.entityId) {
                alert("Funding not available.");
                return;
              }
      
              try {
                // Map entity types to valid fundable types
                let fundableType = profile.entityType;
                if (fundableType === "post") {
                  fundableType = "creator";
                } else if (!fundableType || fundableType === "user") {
                  fundableType = "artist";
                }

                const result = await payViaStripe({
                  paymentType: "funding",
                  entityType: fundableType,
                  entityId: profile.entityId
                });
      
                if (result && result.success === true) {
                  alert("Funding successful.");
                } else {
                  console.log("Funding cancelled or failed");
                }
              } catch (err) {
                console.error("Funding failed:", err);
              }
            }
          },
          "buttonx"
        );
      
        const count = createElement("p", { class: "post-count" }, [
          `Posts: ${profile.postCount}`
        ]);
      
        elements.push(count, fundButton);
      
        if (profile.entityType === "user") {
          const followBtn = createElement(
            "button",
            {
              class: "btn btn-outline",
              onclick: () => {
                profile.isFollowing = !profile.isFollowing;
                followBtn.textContent = profile.isFollowing ? "Unfollow" : "Follow";
              }
            },
            [profile.isFollowing ? "Unfollow" : "Follow"]
          );
      
          elements.push(followBtn);
        }
      }
      

    card.append(...elements);
    return card;
}
