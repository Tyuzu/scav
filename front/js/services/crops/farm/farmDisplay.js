import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { getState } from "../../../state/state.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import {
  renderFarmDetails,
  renderCropSummary,
  renderCropEmojiMap,
  renderCrops,
  createSortDropdown
} from "./displayFarmHelpers.js";
import { displayReviews } from "../../reviews/displayReviews.js";
import { farmChat } from "./farmchat.js";
import Imagex from "../../../components/base/Imagex.js";
import NoLink from "../../../components/base/NoLink.js";
import { persistTabs } from "../../../utils/persistTabs.js";
import { displayNotices } from "../../notices/notices.js";
import { displayFanMedia } from "../../fanmade/ui/mediaGallery.js";
import { renderWeatherDetails } from "../weather/weather.js";
import { createCrop } from "../crop/createCrop.js";

export async function displayFarm(isLoggedIn, farmId, content) {
  const container = createElement("div", { class: "farmpage" });
  content.replaceChildren(container);

  const res = await apiFetch(`/farms/${farmId}`);
  const farm = res?.farm;

  if (!res?.success || !farm) {
    container.append(
      createElement("p", {}, ["Farm not found."])
    );
    return;
  }

  const normalizedFarmId = String(farm.farmid);
  const isCreator = getState("user") === farm.createdBy;

  // ---------- Header ----------
  const header = createElement("div", { class: "farm-header" }, [
    createElement("div", { class: "breadcrumbs" }, [
      NoLink("🏠 Home", "", { click: () => navigate("/") }),
      " / ",
      NoLink("🌾 Farms", "", { click: () => navigate("/farms") }),
      " / ",
      createElement("span", {}, [farm.name || "Farm"])
    ])
  ]);

  // ---------- Banner ----------
  const bannerImage = Imagex({
    src: resolveImagePath(EntityType.FARM, PictureType.BANNER, farm.photo),
    alt: farm.name || "Farm",
    id: "farm-banner-img"
  });

  const banner = createElement("div", { class: "farm-banner" }, [
    bannerImage
  ]);

  if (isCreator) {
    banner.append(
      Button("Edit Banner", "edit-banner-btn", {
        click: () => {
          updateImageWithCrop({
            entityType: EntityType.FARM,
            imageType: "banner",
            stateKey: "banner",
            stateEntityKey: "farm",
            previewElementId: "farm-banner-img",
            pictureType: PictureType.BANNER,
            entityId: normalizedFarmId
          });
        }
      }, "edit-banner-pic")
    );
  }

  // ---------- Aside ----------
  const summaryStats = renderCropSummary(farm.crops || []);
  const cropDistribution = renderCropEmojiMap(farm.crops || []);

  const reviewPlaceholder = createElement("div", { class: "review-block" }, [
    createElement("p", {}, ["⭐ Reviews"]),
    Button("💬 Check reviews", "review-btn", {
      click: () =>
        displayReviews(
          reviewPlaceholder,
          isCreator,
          isLoggedIn,
          "farm",
          normalizedFarmId
        )
    }, "buttonx")
  ]);

  const farmCTA = createElement("div", { class: "cta-block" }, [
    ...(isLoggedIn && !isCreator ? [
      Button("Schedule a visit", "cta-visit-btn", {
        click: () => console.warn("Schedule visit not implemented")
      }, "buttonx"),
      Button("Pre-order", "cta-pre-btn", {
        click: () => console.warn("Pre-order not implemented")
      }, "buttonx"),
      Button("Chat", "cta-chat-btn", {
        click: () => farmChat(farm.createdBy, normalizedFarmId)
      }, "buttonx")
    ] : []),
    ...(isCreator ? [
      Button("Creator Tools", "cta-creator-btn", {
        click: () => console.warn("Creator tools placeholder")
      }, "buttonx")
    ] : [])
  ]);

  const weatherWidget = renderWeatherDetails(farm, isCreator);

  const asideColumn = createElement("aside", { class: "farm-aside" }, [
    weatherWidget,
    farmCTA,
    summaryStats,
    cropDistribution,
    reviewPlaceholder
  ]);

  // ---------- Main ----------
  const mainColumn = createElement("div", { class: "farm-main" });
  const editContainer = createElement("div");

  mainColumn.append(banner, editContainer);

  const tabs = [
    {
      title: "Info",
      id: "info-tab",
      render: (tabContainer) => {
        tabContainer.append(
          renderFarmDetails(farm, isCreator)
        );
      }
    },
    {
      title: "Crops",
      id: "crops-tab",
      render: async (tabContainer) => {
        const cropsContainer = createElement("div", {
          class: "crop-list grid-view"
        });

        const cropHeader = createElement("div", { class: "crop-header" }, [
          createElement("h3", {}, ["🌾 Available Crops"]),
          createSortDropdown(sortBy =>
            renderCrops(
              farm,
              cropsContainer,
              normalizedFarmId,
              mainColumn,
              editContainer,
              isLoggedIn,
              sortBy,
              isCreator
            )
          )
        ]);

        if (isCreator) {
          tabContainer.append(
            Button("Add Crop", "add-crop-btn", {
              click: () => createCrop(normalizedFarmId, content)
            }, "buttonx")
          );
        }

        tabContainer.append(cropHeader, cropsContainer);

        await renderCrops(
          farm,
          cropsContainer,
          normalizedFarmId,
          mainColumn,
          editContainer,
          isLoggedIn,
          "name",
          isCreator
        );
      }
    },
    {
      title: "Notices",
      id: "notices-tab",
      render: (tabContainer) => {
        displayNotices("farm", normalizedFarmId, tabContainer, isCreator);
      }
    },
    {
      title: "Gallery",
      id: "gallery-tab",
      render: (tabContainer) => {
        displayFanMedia(tabContainer, "farm", normalizedFarmId, isCreator);
      }
    },
    {
      title: "Reviews",
      id: "reviews-tab",
      render: (tabContainer) => {
        displayReviews(
          tabContainer,
          isCreator,
          isLoggedIn,
          "farm",
          normalizedFarmId
        );
      }
    }
  ];

  persistTabs(mainColumn, tabs, `farm-tabs:${normalizedFarmId}`);

  // ---------- Layout ----------
  const layoutWrapper = createElement(
    "div",
    { class: "farm-layout" },
    [mainColumn, asideColumn]
  );

  container.append(header, layoutWrapper);
}