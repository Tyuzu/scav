// farmListHelpers.js
import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/index.js";
import Button from "../../../components/base/Button.js";
import {
  resolveImagePath,
  PictureType,
  EntityType
} from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

// ---------- Farm Cards ----------

function renderFarmCards(farms, grid, isLoggedIn, onToggleFavorite) {
  for (const farm of farms) {
    grid.appendChild(FarmCard(farm, isLoggedIn, onToggleFavorite));
  }
}

function FarmCard(farm, isLoggedIn, onToggleFavorite) {
  const farmId = String(farm.id || farm.farmid || "");

  const card = createElement("div", { class: "farm__card" });

  const img = Imagex({
    src: resolveImagePath(
      EntityType.FARM,
      PictureType.THUMB,
      farm.photo
    ),
    alt: farm.name || "Farm",
    classes: "farm__image"
  });

  const header = createElement("div", { class: "farm__header" }, [
    createElement("h3", {}, [farm.name || "Unnamed Farm"]),
    createElement("p", { class: "farm__location" }, [
      farm.location || "Unknown location"
    ])
  ]);

  const badges = createFarmBadges(farm);

  const meta = createElement("div", { class: "farm__meta" }, [
    createElement("p", {}, [`Owner: ${farm.owner || "N/A"}`]),
    createElement("p", {}, [farm.description || "No description"])
  ]);

  const cropsSection = createElement(
    "div",
    { class: "farm__crops-preview" },
    [
      createElement("h4", {}, ["Crops"]),
      createCropList(farm.crops)
    ]
  );

  const actions = createElement("div", { class: "farm__actions" }, [
    Button(
      "View",
      `farm-${farmId}`,
      { click: () => navigate(`/farm/${farmId}`) },
      "farm__button"
    )
  ]);

  card.append(img, header, badges, meta, cropsSection, actions);
  return card;
}

// ---------- Crops ----------

function createCropList(crops) {
  const cropList = createElement("div", { class: "crop__list" });
  const items = Array.isArray(crops) ? crops.slice(0, 4) : [];

  for (const crop of items) {
    const cropCard = createElement("div", { class: "crop__card" });

    const img = Imagex({
      src: resolveImagePath(
        EntityType.CROP,
        PictureType.THUMB,
        crop.banner
      ),
      alt: crop.name || "Crop",
      classes: "crop__image"
    });

    const infoChildren = [
      createElement("strong", {}, [crop.name || "Unnamed"])
    ];

    if (crop.outOfStock) {
      infoChildren.push(
        createElement("span", { class: "crop__badge out" }, ["Out of Stock"])
      );
    } else if (crop.featured) {
      infoChildren.push(
        createElement("span", { class: "crop__badge featured" }, ["Featured"])
      );
    }

    const cropInfo = createElement(
      "div",
      { class: "crop__info" },
      infoChildren
    );

    cropCard.append(img, cropInfo);
    cropList.appendChild(cropCard);
  }

  return cropList;
}

// ---------- Badges ----------

function createFarmBadges(farm) {
  const badgeWrap = createElement("div", { class: "farm__badges" });

  if (farm.organic) {
    badgeWrap.append(
      createElement("span", { class: "farm__badge" }, ["Organic"])
    );
  }

  if (farm.delivers) {
    badgeWrap.append(
      createElement("span", { class: "farm__badge" }, ["Delivers"])
    );
  }

  if (farm.hydroponic) {
    badgeWrap.append(
      createElement("span", { class: "farm__badge" }, ["Hydroponic"])
    );
  }

  return badgeWrap;
}

// ---------- Sidebar Sections (Pure Renderers) ----------

function renderFeaturedFarm(container, farm) {
  if (!farm) return;

  const farmId = String(farm.id || farm.farmid || "");

  container.append(
    createElement("section", { class: "farm__featured" }, [
      createElement("h3", {}, ["🌟 Featured Farm"]),
      Imagex({
        src: resolveImagePath(
          EntityType.FARM,
          PictureType.THUMB,
          farm.photo
        ),
        alt: farm.name || "Farm",
        classes: "farm__featured-photo"
      }),
      createElement("h4", {}, [farm.name || "Unnamed Farm"]),
      createElement("p", {}, [farm.location || "Unknown location"]),
      createElement("p", {}, [farm.description || "No description provided."]),
      createElement("p", { class: "farm__featured-rating" }, [
        `⭐ ${farm.avgRating?.toFixed(1) || "N/A"} (${farm.reviewCount || 0} reviews)`
      ]),
      Button(
        "View",
        `featured-${farmId}`,
        { click: () => navigate(`/farm/${farmId}`) },
        "farm__button"
      )
    ])
  );
}

function renderCTAFarm(container) {
  container.append(
    createElement("section", { class: "farm__Cta" }, [
      Button("Buy Tools", "buytools-crp-btn", {
        click: () => navigate("/tools")
      }, "buttonx"),
      Button("Chats", "chatss-frm-btn", {
        click: () => navigate("/merechats")
      }, "buttonx"),
      Button("Create Farm", "crt-frm-btn", {
        click: () => navigate("/create-farm")
      }, "buttonx")
    ])
  );
}

function renderWeatherWidget(container) {
  container.append(
    createElement("section", { class: "farm__weather" }, [
      createElement("h3", {}, ["🌤 Weather"]),
      createElement("p", {}, ["Today: Sunny, 28°C"]),
      createElement("p", {}, ["Tomorrow: Light rain, 26°C"])
    ])
  );
}

function renderFarmStats(container, farms) {
  const locations = new Set();
  const crops = new Set();

  for (const farm of farms) {
    if (farm.location) locations.add(farm.location);
    (farm.crops || []).forEach(c => c?.name && crops.add(c.name));
  }

  container.append(
    createElement("section", { class: "farm__stats" }, [
      createElement("h3", {}, ["📊 Farm Stats"]),
      createElement("p", {}, [`Total Farms: ${farms.length}`]),
      createElement("p", {}, [`Locations: ${locations.size}`]),
      createElement("p", {}, [`Unique Crops: ${crops.size}`])
    ])
  );
}

// ---------- Exports ----------

export {
  renderFarmCards,
  FarmCard,
  createCropList,
  createFarmBadges,
  renderFeaturedFarm,
  renderCTAFarm,
  renderWeatherWidget,
  renderFarmStats
};
