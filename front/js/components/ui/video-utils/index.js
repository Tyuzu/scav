/**
 * Video Player Utility Setup
 * 
 * Core setup function that initializes gesture handlers, hotkeys, and progress tracking
 * for video players. Handles cross-browser video interaction and accessibility.
 * 
 * @module video-utils
 */

import { setupHotkeys } from "./hotkeys.js";
import { setupGestures } from "./gestureHandlers.js";
import { saveVideoProgress } from "./progressSaver.js";

/**
 * Setup video player utility functions
 * 
 * Initializes gesture handlers, keyboard shortcuts, and progress tracking.
 * Automatically detects dark mode preference and applies styling.
 * 
 * @param {HTMLVideoElement} video - Video element to enhance
 * @param {string} videoid - Optional video ID for progress tracking
 * 
 * @example
 * const video = document.querySelector('video');
 * setupVideoUtilityFunctions(video, 'video-123');
 */
export function setupVideoUtilityFunctions(video, videoid) {
  setupGestures(video);
  setupHotkeys(video);

  if (videoid) {
    saveVideoProgress(video, videoid);
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    (video.parentElement || document.body).classList.add("dark-mode");
  }
}
