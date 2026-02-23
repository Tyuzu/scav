import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../home/homeHelpers.js";

export async function displayPlaces(isLoggedIn, container) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "places-page" });
  const aside = createElement("aside", { class: "places-aside" });
  const main = createElement("div", { class: "places-main" });

  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(createElement("h2", {}, ["Actions"]));

  if (isLoggedIn) {
    aside.append(
      Button("Create Place", "", { click: () => navigate("/create-place") }, "buttonx primary")
    );
  }

  aside.append(
    Button("Create Itinerary", "", { click: () => navigate("/itinerary") }, "buttonx primary"),
    Button("Manage Places", "", { click: () => navigate("/places/manage") }, "buttonx secondary"),
    Button("Help / FAQ", "", { click: () => navigate("/help") }, "buttonx secondary")
  );

  aside.append(adspace("aside"));

  // ---------- TITLE ----------
  main.append(createElement("h1", {}, ["All Places"]));
  main.append(adspace("inbody"));

  // ---------- FETCH PLACES ----------
  let places = [];
  try {
    const resp = await apiFetch("/places/places?page=1&limit=100");
    places = Array.isArray(resp) ? resp : resp?.data || resp?.places || [];
  } catch (err) {
    console.error("Failed to load places", err);
  }

  // ---------- LIST ----------
  const list = createElement("div", { class: "places-list" });

  if (!places.length) {
    list.append(createElement("p", {}, ["No matching places."]));
    main.append(list);
    return;
  }

  places.forEach((place, idx) => {
    list.append(createPlaceCard(place));

    if ((idx + 1) % 6 === 0) {
      list.append(adspace("inlist"));
    }
  });

  main.append(list);
}

// ---------- CARD BUILDER ----------
function createPlaceCard(place) {
  const bannerUrl = place.banner
    ? resolveImagePath(EntityType.PLACE, PictureType.THUMB, place.banner)
    : resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.png");

  const image = Imagex({
    src: bannerUrl,
    alt: `${place.name || "Unnamed"} Banner`,
    loading: "lazy"
  });

  image.onerror = () => {
    image.src = resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.png");
  };

  const metaRow = createElement(
    "div",
    {
      style: "display:flex;align-items:center;justify-content:space-between;margin-top:4px;"
    },
    [createElement("span", { class: "badge" }, [place.category || "-"])]
  );

  return createElement(
    "div",
    { class: "place-card" },
    [
      createElement(
        "a",
        {
          href: `/place/${place.placeid}`,
          style: "text-decoration:none;color:inherit;display:block;"
        },
        [
          image,
          createElement("div", { class: "place-info" }, [
            metaRow,
            createElement("h2", {}, [place.name || "Unnamed Place"]),
            createElement("p", {}, [place.address || "-"]),
            createElement("p", {}, [place.short_desc || "-"])
          ])
        ]
      )
    ]
  );
}
