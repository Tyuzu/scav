// src/utils/imagePaths.js

import { SRC_URL } from "../state/state";

// Entity types
export const EntityType = {
  ARTIST: "artist",
  MEMBER: "member",
  USER: "user",
  BAITO: "baito",
  WORKER: "worker",
  SONG: "song",
  POST: "post",
  CHAT: "chat",
  EVENT: "event",
  FARM: "farm",
  CROP: "crop",
  PLACE: "place",
  RECIPE: "recipe",
  PRODUCT: "product",
  TOOL: "tool",
  LIVE: "live",
  MEDIA: "media",
  MERCH: "merch",
  MENU: "menu",
  FEED: "feed",
  LOOP: "loops",
};

// Picture types
export const PictureType = {
  BANNER: "banner",
  PHOTO: "photo",
  POSTER: "poster",
  SEATING: "seating",
  MEMBER: "member",
  THUMB: "thumb",
  IMAGE: "images",
  AUDIO: "audio",
  VIDEO: "videos",
  DOCUMENT: "docs",
  GALLERY: "gallery",
  FILE: "files",
};

// Folder mapping
const PictureSubfolders = {
  [PictureType.BANNER]: "banner",
  [PictureType.PHOTO]: "photo",
  [PictureType.POSTER]: "poster",
  [PictureType.SEATING]: "seating",
  [PictureType.MEMBER]: "member",
  [PictureType.THUMB]: "thumb",
  [PictureType.IMAGE]: "images",
  [PictureType.AUDIO]: "audio",
  [PictureType.VIDEO]: "videos",
  [PictureType.DOCUMENT]: "docs",
  [PictureType.GALLERY]: "gallery",
  [PictureType.FILE]: "files",
};

export function resolveImagePath(entityType, pictureType, filename, fallback = "/assets/fallbacks.png") {
  if (!entityType || !pictureType || !filename || typeof filename !== "string") {
    return fallback;
  }

  // reject unsafe input
  if (/^(file:|data:|javascript:)/i.test(filename) || filename.includes("..")) {
    return fallback;
  }

  try {
    const url = new URL(filename, window.location.origin);

    // if it's a full external http/https URL
    if (url.protocol === "http:" || url.protocol === "https:") {
      const host = url.hostname;
      const isBlockedHost =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

      // if host is safe → proxy it
      if (!isBlockedHost) {
        const cleanUrl = filename.replace(/^https?:\/\//, ""); // strip https://
        return `${SRC_URL}/proxy/https/${cleanUrl}`;
      }
    }
  } catch {
    // not a valid absolute URL → local file case
  }

  // local file path (uploads)
  if (!/^[a-zA-Z0-9._/-]+$/.test(filename)) {
    return fallback;
  }

  const folder = PictureSubfolders[pictureType] || "misc";
  let finalName = filename;

  // normalize extensions
  if (pictureType === PictureType.THUMB) {
    if (!finalName.endsWith(".jpg")) {
      finalName = finalName.replace(/\.[^.]+$/, "") + ".jpg";
    }
  } else if (isImageType(pictureType)) {
    if (!finalName.endsWith(".png")) {
      finalName = finalName.replace(/\.[^.]+$/, "") + ".png";
    }
  }

  return `${SRC_URL}/uploads/${entityType}/${folder}/${finalName}`;
}

// Helper to check if type is image (non-thumb)
function isImageType(pictureType) {
  return [
    PictureType.PHOTO,
    PictureType.POSTER,
    PictureType.BANNER,
    PictureType.SEATING,
    PictureType.MEMBER,
    PictureType.IMAGE,
    PictureType.GALLERY,
  ].includes(pictureType);
}
