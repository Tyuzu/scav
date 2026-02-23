import { displayFanMedia } from "../fanmade/ui/mediaGallery.js";
import { displayLive } from "../vlive/displayLive.js";
import { displayMedia } from "../media/ui/mediaGallery.js";
import { persistTabs } from "../../utils/persistTabs.js";


export function renderLiveTab(containter, artistid, isL, isCreator) {
    displayLive(containter, "artist", artistid, isCreator);
}


export async function renderPostsTab(container, artistID, isLoggedIn) {
    const tabs = [
      { title: "Fanmade", id: "artist-fanmade", render: (c) => displayFanMedia(c, "fanmade", artistID, isLoggedIn) },
      { title: "Artist", id: "artist-posts", render: (c) => displayMedia(c, "artist", artistID, isLoggedIn) },
    ];
  
    persistTabs(container, tabs, `media-tabs:${artistID}`);
  }
  