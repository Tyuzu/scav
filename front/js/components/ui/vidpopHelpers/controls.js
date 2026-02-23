import { createFilterSelector } from "./filters.js";
import { createProgressBar } from "./progressBar.js";
import { createQualitySelector } from "./qualitySelector.js";
import { createSpeedDropdown } from "./speedDropdown.js";
import { toggleFullScreen, setupFullscreenControls } from "./fullscreen.js";
import { createElement } from "../../createElement.js";
import { createIconButton } from "../../../utils/svgIconButton.js";
import { maximizeSVG, muteSVG, vol2SVG, settingsSVG, skipBackSVG, skipForwardSVG } from "../../../components/svgs.js";

export function appendElements(parent, children) {
  children.forEach(child => child && parent.appendChild(child));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function createControls(video, mediaSrc, qualities, videoid, videoPlayer) {
  const controls = createElement("div", { class: "controlcon" });

  // --- Time Display ---
  const timeDisplay = createElement("div", { class: "time-display" }, ["0:00 / 0:00"]);

  // --- Progress Bar ---
  const { bar: progressBar } = createProgressBar();

  // Buttons container
  const buttons = createElement("div", { class: "buttons" });

  // Optional Quality Selector
  const qualitySelector = qualities.length 
    ? createQualitySelector(video, qualities, { allowSame: true }) 
    : null;

  const speedDropdown = createSpeedDropdown(video);
  const filterSelector = createFilterSelector(video);

  // --- Mute Button ---
  const muteButton = createIconButton({
    classSuffix: "mute bonw",
    svgMarkup: video.muted ? muteSVG : vol2SVG,
    onClick: () => {
      video.muted = !video.muted;
      muteButton.innerHTML = video.muted ? muteSVG : vol2SVG;
      muteButton.setAttribute("aria-label", video.muted ? "Muted" : "Unmuted");
    },
    label: ""
  });

  // --- Fullscreen Button ---
  const fullscreenButton = createIconButton({
    classSuffix: "fullscreen bonw",
    svgMarkup: maximizeSVG,
    onClick: () => toggleFullScreen(videoPlayer),
    label: "",
    ariaLabel: "Toggle Fullscreen"
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === videoPlayer) {
      fullscreenButton.setAttribute("aria-label", "Exit Fullscreen");
    } else {
      fullscreenButton.setAttribute("aria-label", "Enter Fullscreen");
    }
  });

  // --- Skip Buttons ---
  const skipBackButton = createIconButton({
    classSuffix: "skipback bonw",
    svgMarkup: skipBackSVG,
    onClick: () => { video.currentTime = Math.max(video.currentTime - 10, 0); },
    label: "",
    ariaLabel: "Skip Back 10 seconds"
  });

  const skipForwardButton = createIconButton({
    classSuffix: "skipforward bonw",
    svgMarkup: skipForwardSVG,
    onClick: () => { video.currentTime = Math.min(video.currentTime + 10, video.duration); },
    label: "",
    ariaLabel: "Skip Forward 10 seconds"
  });

  // --- Dropup Menu ---
  const dropupMenu = createElement("div", { class: "dropup-menu hidden" });
  appendElements(dropupMenu, [speedDropdown, filterSelector]);

  const settingsButton = createIconButton({
    classSuffix: "settings bonw",
    svgMarkup: settingsSVG,
    onClick: () => { dropupMenu.classList.toggle("hidden"); },
    label: "",
    ariaLabel: "Settings"
  });

  document.addEventListener("click", (e) => {
    if (!dropupMenu.contains(e.target) && !settingsButton.contains(e.target)) {
      dropupMenu.classList.add("hidden");
    }
  });

  // --- Append all buttons ---
  appendElements(buttons, [
    qualitySelector,
    muteButton,
    skipBackButton,
    skipForwardButton,
    settingsButton,
    fullscreenButton
  ].filter(Boolean));

  buttons.appendChild(dropupMenu);

  // --- Append to controls ---
  appendElements(controls, [timeDisplay, progressBar, buttons]);

  // --- Update Time Display ---
  const updateTime = () => {
    const elapsed = formatTime(video.currentTime);
    const total = formatTime(video.duration || 0);
    timeDisplay.textContent = `${elapsed} / ${total}`;
  };

  video.addEventListener("timeupdate", updateTime);
  video.addEventListener("loadedmetadata", updateTime);

  // Fullscreen controls logic
  setupFullscreenControls(videoPlayer, controls);

  return controls;
}
