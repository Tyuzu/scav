import {
  renderMerchTab,
  renderEventsTab,
  renderAlbumsTab
} from "./artistTabs.js";
import { renderSongsTab } from "./artistSongsTab.js";
import { apiFetch } from "../../api/api.js";
import { deleteArtistForm } from "./createOrEditArtist.js";
import { createOrEditArtist } from "./createOrEditArtist.js";
import { createElement } from "../../components/createElement.js";
import { reportPost } from "../reporting/reporting.js";
import Button from "../../components/base/Button.js";
import { toggleAction } from "../beats/toggleFollows.js";
import { getState } from "../../state/state.js";
import { persistTabs } from "../../utils/persistTabs.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Imagex from "../../components/base/Imagex.js";
import { renderPostsTab, renderLiveTab } from "./moretabs.js";
import { displayNotices } from "../notices/notices.js";
import { renderBandMembers, renderManageMembersButton } from "./memberManage.js";
import { blueskySVG, facebookSVG, instagramSVG, soundcloudSVG, spotifySVG, tiktokSVG, twitterSVG, xitterSVG, youtubeSVG } from "../../components/socialSVGs.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { payViaStripe } from "../pay/pay.js";

// --- CREATOR-ONLY BANNER SECTION ---
function createArtistBannerSection(artist, isCreator) {
  const bannerSection = createElement("div", { class: "artist-banner" });
  const bannerSrc = resolveImagePath(EntityType.ARTIST, PictureType.BANNER, artist.banner);

  const bannerImage = Imagex({
    id: "artist-banner-img",
    src: bannerSrc,
    alt: `Banner for ${artist.name || "Artist"}`,
    classes: "artist-banner"
  });

  bannerSection.appendChild(bannerImage);

  if (isCreator) {
    const bannerEditButton = createElement("button", { class: "edit-banner-pic" }, ["Edit Banner"]);
    bannerEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: EntityType.ARTIST,
        imageType: "banner",
        stateKey: "banner",
        stateEntityKey: "artist",
        previewElementId: "artist-banner-img",
        pictureType: PictureType.BANNER,
        entityId: artist.artistid
      });
    });
    bannerSection.appendChild(bannerEditButton);
  }

  return bannerSection;
}


// --- CREATOR-ONLY PHOTO SECTION ---
function createArtistPhotoSection(artist, isCreator) {
  const photoSection = createElement("div", { class: "artist-photo" });
  const photoSrc = resolveImagePath(EntityType.ARTIST, PictureType.THUMB, artist.photo);

  const photoImg = Imagex({
    id: "artist-avatar-img",
    src: photoSrc,
    alt: `${artist.name || "Artist"}'s photo`,
    classes: "artist-photo"
  });

  photoSection.appendChild(photoImg);

  if (isCreator) {
    const photoEditButton = createElement("button", { class: "edit-banner-pic" }, ["Edit Photo"]);
    photoEditButton.addEventListener("click", () => {
      updateImageWithCrop({
        entityType: EntityType.ARTIST,
        imageType: "photo",
        stateKey: "photo",
        stateEntityKey: "artist",
        previewElementId: "artist-avatar-img",
        pictureType: PictureType.PHOTO,
        entityId: artist.artistid
      });
    });
    photoSection.appendChild(photoEditButton);
  }

  return photoSection;
}


// --- MAIN DISPLAY ---
export async function displayArtist(content, artistID, isLoggedIn) {
  content.replaceChildren();
  const contentContainer = createElement("div", { class: "artistpage" });
  content.appendChild(contentContainer);

  try {
    const artist = await apiFetch(`/artists/${artistID}`);
    if (!artist) {
      contentContainer.appendChild(createElement("p", {}, ["Artist not found."]));
      return;
    }

    const user = getState("user");
    const isCreator = isLoggedIn && artist.creatorid === user;
    const isSubscribed = artist.subscribed === true;

    // --- PHOTO & BANNER ROW ---
    const photoBannerRow = createElement("div", { class: "hflex-sb photocon" });
    const photoSection = createArtistPhotoSection(artist, isCreator);
    if (photoSection) photoBannerRow.appendChild(photoSection);
    photoBannerRow.appendChild(createArtistBannerSection(artist, isCreator));
    contentContainer.appendChild(photoBannerRow);

    // --- BUTTONS ---
    const buttonRow = createElement("div", { class: "hflex hcen" });

    const subscribeButton = Button(isSubscribed ? "Unsubscribe" : "Subscribe", "", {
      click: () => SubscribeToArtist(subscribeButton, artist.artistid)
    }, "buttonx");
    // buttonRow.appendChild(subscribeButton);

    const reportButton = Button("Report", "report-btn", {
      click: () => reportPost(artistID, "artist")
    }, "buttonx");
    // buttonRow.appendChild(reportButton);
    const fundBtn = Button(
      "Fund Artist",
      "fund-artist-btn",
      {
        click: async () => {
          try {
            const result = await payViaStripe({
              paymentType: "funding",
              entityType: "artist",
              entityId: artist.artistid
            });
    
            if (!result || result.success !== true) {
              console.error("Artist funding failed or was cancelled");
              return;
            }
    
            // optional: post-success local handling
            // e.g. refresh balance, show toast, etc.
          } catch (err) {
            console.error("Artist funding failed:", err);
          }
        }
      },
      "buttonx secondary"
    );
    
    
    // const fundBtn = Button("Fund Artist", "fund-artist-btn", {
    //   click: () => payViaStripe({
    //     entityType: "funding",
    //     entityId: "artist-5678",
    //     type: "voluntary",
    //     options: [500, 1000, 2000], // predefined amounts in cents
    //     allowCustom: true,
    //     description: "Support your favorite artist"
    //   })
    // }, "buttonx secondary");

    buttonRow.append(subscribeButton, reportButton, fundBtn);

    if (isCreator) {
      const editDiv = createElement("div", { class: "editdiv", id: "editevent" });
      buttonRow.appendChild(editDiv);
    }

    contentContainer.appendChild(buttonRow);

    // --- BASE TABS ---
    const baseTabs = [
      { title: "Overview", id: "artist-overview", render: (c) => renderOverviewTab(c, artist, isCreator, isLoggedIn) },
      { title: "Events", id: "artist-events", render: (c) => renderEventsTab(c, artistID, isCreator) },
      { title: "Posts", id: "artist-posts", render: (c) => renderPostsTab(c, artistID, isLoggedIn) },
      { title: "Live", id: "artist-live", render: (c) => renderLiveTab(c, artistID, isLoggedIn, isCreator) },
      { title: "Notices", id: "notices-tab", render: (tabContainer) => { displayNotices("artist", artistID, tabContainer, isCreator); } },
    ];

    // --- CATEGORY-BASED TABS ---
    const categoryTabs = {
      singer: [
        { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
        { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
      ],
      band: [
        { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) },
        { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
      ],
      rapper: [
        { title: "Tracks", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
        { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
      ],
      composer: [
        { title: "Compositions", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) }
      ],
      musician: [
        { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
        { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
      ],
      painter: [
        { title: "Gallery", id: "artist-gallery", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
      ],
      default: [
        { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
      ]
    };

    const cat = artist.category?.toLowerCase() || "default";
    const tabs = [...baseTabs, ...(categoryTabs[cat] || categoryTabs.default)];

    persistTabs(contentContainer, tabs, `artist-tabs:${artistID}`);

  } catch (error) {
    contentContainer.replaceChildren();
    contentContainer.appendChild(
      createElement("p", {}, [`Error loading artist profile: ${error.message}`])
    );
  }
}


// --- SOCIAL ICON ---
function getSocialIcon(platform) {
  const lc = platform.toLowerCase();
  const icons = {
    instagram: instagramSVG,
    twitter: twitterSVG,
    youtube: youtubeSVG,
    facebook: facebookSVG,
    tiktok: tiktokSVG,
    spotify: spotifySVG,
    soundcloud: soundcloudSVG,
    bluesky: blueskySVG,
    x: xitterSVG,
    website: "🌐",
    link: "🔗"
  };
  for (const key in icons) {
    if (lc.includes(key)) return icons[key];
  }
  return icons.link;
}


// --- SUBSCRIBE ---
function SubscribeToArtist(followBtn, artistId) {
  toggleAction({
    entityId: artistId,
    entityType: "artist",
    button: followBtn,
    apiPath: "/subscribes/",
    labels: { on: "Unsubscribe", off: "Subscribe" },
    actionName: "subscribed"
  });
}

function renderOverviewTab(container, artist, isCreator, isLoggedIn) {
  const artistDiv = createElement("div", { class: "artist-container" });

  if (isCreator) artistDiv.appendChild(renderCreatorActions(artist, container, isLoggedIn));
  artistDiv.appendChild(createElement("h2", { class: "artist-name" }, [artist.name || "Unknown Artist"]));
  artistDiv.appendChild(renderArtistDetails(artist));
  if (artist.socials) artistDiv.appendChild(renderSocialLinks(artist.socials));
  if (isCreator && artist.category?.toLowerCase() === "band") artistDiv.appendChild(renderManageMembersButton(artist.artistid, container));
  if (artist.members?.length > 0) artistDiv.appendChild(renderBandMembers(artist, isCreator));
  renderAlbumsTab(artist.artistid, isCreator)
    .then(c => {
      artistDiv.appendChild(c);
    });

  container.appendChild(artistDiv);
}

function renderArtistDetails(artist) {
  const detailsDiv = createElement("div", { class: "artist-details" });

  const fields = [
    { label: "🎨 Artist Type", value: artist.category || "Unknown" },
    { label: "📖 Biography", value: artist.bio || "No biography available" },
    { label: "🎂 Date of Birth", value: artist.dob || "" },
    { label: "📍 Place", value: [artist.place, artist.country].filter(Boolean).join(", ") },
    {
      label: "🎶 Genres",
      value: Array.isArray(artist.genres) && artist.genres.length > 0
        ? artist.genres.join(", ")
        : "None"
    }
  ];

  fields.forEach(({ label, value }) =>
    detailsDiv.appendChild(createElement("p", {}, [
      createElement("strong", {}, [`${label}:`]),
      ` ${value}`
    ]))
  );

  return detailsDiv;
}


function renderSocialLinks(socials) {
  const links = Object.entries(socials).map(([platform, url]) =>
    createElement("a", {
      href: url,
      target: "_blank",
      class: "social-link",
      rel: "noopener noreferrer"
    }, [createIconButton({ svgMarkup: getSocialIcon(platform), classSuffix: "", label: platform })])
  );

  return createElement("div", { class: "socials" }, [
    createElement("p", {}, [createElement("strong", {}, ["🔗 Socials:"])]),
    ...links
  ]);
}

function renderCreatorActions(artist, container, isLoggedIn) {
  const actions = [];

  actions.push(Button("✏️ Edit Artist", "", {
    click: async () => {
      const existingArtist = await apiFetch(`/artists/${artist.artistid}`);
      const editContainer = document.getElementById("editartist") || container;
      createOrEditArtist({
        isLoggedIn,
        content: editContainer,
        mode: "edit",
        artistID: artist.artistid,
        existingArtist,
        isCreator: true
      });
    }
  }, "edit-artist-btn buttonx"));

  actions.push(Button("🗑️ Request Deletion", "", {
    click: () => deleteArtistForm(isLoggedIn, artist.artistid, true)
  }, "del-artist-btn buttonx"));

  if (!document.getElementById("editartist")) {
    actions.push(createElement("div", { class: "editform", id: "editartist" }));
  }

  return createElement("div", { class: "creator-actions" }, actions);
}

