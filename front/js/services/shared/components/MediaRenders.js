/**
 * Consolidated Media Rendering Components
 * Consolidates RenderVideoPost, RenderImagePost, RenderAudioPost
 * Previously duplicated across: feed/, newchat/, merechats/
 */

import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import VideoPlayer from '../../../components/ui/VideoPlayer.mjs';
import AudioPlayer from '../../../components/ui/AudioPlayer.mjs';
import ZoomBox from "../../../components/ui/ZoomBox.mjs";
import Imagex from "../../../components/base/Imagex.js";

/**
 * Renders video posts with player configuration
 * @param {HTMLElement} mediaContainer - Container to append video players to
 * @param {Array} media - Array of video sources
 * @param {string} media_url - Base media URL
 * @param {Array} resolutions - Available video resolutions
 * @param {Array} subtits - Subtitles data
 * @param {string} posterPath - Poster image path
 * @param {string} entityType - Entity type context (FEED, CHAT, etc.)
 * @returns {Array} Array of video player elements
 */
export async function RenderVideoPost(
  mediaContainer,
  media,
  media_url = "",
  resolutions,
  subtits,
  posterPath,
  entityType = EntityType.FEED
) {
  const players = [];

  media.forEach((videoSrc) => {
    const player = VideoPlayer(
      {
        src: videoSrc,
        className: 'post-video',
        poster: posterPath,
        loop: true,
        controls: false,
        subtitles: subtits,
        availableResolutions: resolutions
      },
      media_url
    );

    // Error handling / fallback
    const videoEl = player.querySelector("video");
    if (videoEl) {
      videoEl.onerror = () => {
        const fallback = document.createElement("div");
        fallback.classList.add("video-error");
        fallback.textContent = "Video failed to load.";
        player.replaceWith(fallback);
      };
    }

    mediaContainer.appendChild(player);
    players.push(player);
  });

  return players;
}

/**
 * Renders image posts with zoom gallery support
 * @param {HTMLElement} mediaContainer - Container to append images to
 * @param {Array} media - Array of image sources
 * @param {string} entityType - Entity type context (FEED, CHAT, etc.)
 * @param {Function} zoomHandler - Optional custom zoom handler (defaults to ZoomBox)
 */
export async function RenderImagePost(
  mediaContainer,
  media,
  entityType = EntityType.FEED,
  zoomHandler = null
) {
  const mediaClasses = [
    'PostPreviewImageView_-one__-6MMx',
    'PostPreviewImageView_-two__WP8GL',
    'PostPreviewImageView_-three__HLsVN',
    'PostPreviewImageView_-four__fYIRN',
    'PostPreviewImageView_-five__RZvWx',
    'PostPreviewImageView_-six__EG45r',
    'PostPreviewImageView_-seven__65gnj',
    'PostPreviewImageView_-eight__SoycA'
  ];

  const classIndex = Math.min(media.length - 1, mediaClasses.length - 1);
  const assignedClass = mediaClasses[classIndex];

  const imageList = document.createElement('ul');
  imageList.className = `preview_image_wrap__Q29V8 PostPreviewImageView_-artist__WkyUA PostPreviewImageView_-bottom_radius__Mmn-- ${assignedClass}`;

  const fullImagePaths = media.map((img) =>
    resolveImagePath(entityType, PictureType.PHOTO, img)
  );

  media.forEach((img, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'PostPreviewImageView_image_item__dzD2P';

    const thumbPath = resolveImagePath(entityType, PictureType.THUMB, img);

    const handleZoom = () => {
      if (zoomHandler) {
        zoomHandler(fullImagePaths, index);
      } else {
        startDefaultZoombox(fullImagePaths, index);
      }
    };

    const image = Imagex({
      src: thumbPath,
      loading: "lazy",
      alt: "Post Image",
      classes: 'post-image PostPreviewImageView_post_image__zLzXH',
      events: { click: handleZoom }
    });

    listItem.appendChild(image);
    imageList.appendChild(listItem);
  });

  mediaContainer.appendChild(imageList);
}

/**
 * Renders audio posts with player and lyrics
 * @param {HTMLElement} mediaContainer - Container to append audio player to
 * @param {string} media_url - Audio media URL
 * @param {Array} resolution - Available audio resolutions
 * @param {string} entityType - Entity type context (FEED, CHAT, etc.)
 * @param {Array} lyricsData - Custom lyrics data (uses defaults if not provided)
 */
export async function RenderAudioPost(
  mediaContainer,
  media_url = "",
  resolution,
  entityType = EntityType.FEED,
  lyricsData = null
) {
  // Default lyrics if none provided
  const defaultLyrics = [
    { time: 2, text: "First line of lyrics..." },
    { time: 5, text: "Second line of lyrics..." },
    { time: 8, text: "Third line of lyrics..." },
    { time: 13, text: "Fourth line of lyrics..." },
    { time: 20, text: "First line of lyrics..." },
    { time: 25, text: "Second line of lyrics..." },
    { time: 28, text: "Third line of lyrics..." },
    { time: 33, text: "Fourth line of lyrics..." }
  ];

  const audioSrc = resolveImagePath(
    entityType,
    PictureType.AUDIO,
    `${media_url}.mp3`
  );
  const posterPath = resolveImagePath(
    entityType,
    PictureType.THUMB,
    `${media_url}.jpg`
  );

  const audiox = AudioPlayer({
    src: audioSrc,
    className: 'post-audio',
    muted: false,
    poster: posterPath,
    lyricsData: lyricsData || defaultLyrics,
    controls: true,
    resolutions: resolution
  });

  mediaContainer.appendChild(audiox);
}

/**
 * Default zoom box handler for images
 * @private
 */
function startDefaultZoombox(images, index) {
  ZoomBox(images, index);
}
