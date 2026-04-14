import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { navigate } from "../../../routes/index.js";
import { getState } from "../../../state/state.js";
import Imagex from "../../../components/base/Imagex.js";

export function HireWorkerCard(worker) {
  const isLoggedIn = Boolean(getState("token"));
  const isSelf = getState("user") === worker.userId;

  const card = createElement("div", { class: "worker-card" });

  // Worker photo
  const photo = createElement("div", { class: "worker-photo" });

  const profileImg = Imagex( {
    src: resolveImagePath(EntityType.WORKER, PictureType.THUMB, worker.profilePic),
    classes: "profile-thumbnail",
    loading: "lazy",
    alt: `${worker.name || "Worker"}'s profile photo`
  });

  photo.appendChild(profileImg);

  // Render details
  function renderDetail(icon, text) {
    if (!text) {
return null;
}
    return createElement("p", {}, [
      icon + " ",
      String(text)
    ]);
  }


  const details = createElement("div", { class: "worker-details" }, [
    createElement("h3", {}, [worker.name || "Unnamed Worker"]),
    renderDetail("📞", worker.phone),
    renderDetail("🛠", worker.preferredRoles?.join(", ")),
    renderDetail("📍", worker.location),
    renderDetail("📝", worker.bio),
    !isSelf && isLoggedIn
      ? Button(
        "View Profile",
        `hire-${worker.baitoUserId}`,
        {
          click: (e) => {
            e.stopPropagation();
            navigate(`/baitos/worker/${worker.baitoUserId}`);
          }
        },
        "btn btn-primary",
        {}
      )
      : !isSelf
        ? createElement("p", { style: "color:gray;" }, ["🔒 Login to hire"])
        : null
  ].filter(Boolean));


  card.appendChild(photo);
  card.appendChild(details);

  // Click anywhere on card to view profile
  card.addEventListener("click", () => navigate(`/baitos/worker/${worker.baitoUserId}`));

  return card;
  // return createElement("a", {
  //   href: `/baitos/worker/${worker.baito_user_id}`,
  //   events: {
  //     click: (e) => {
  //       e.preventDefault();
  //       e.stopPropagation();
  //       navigate(`/baitos/worker/${worker.baito_user_id}`);
  //     }
  //   }
  // }, [card]);
  
}
