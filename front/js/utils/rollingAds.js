// rollingAds.js (module)

import { apiFetch } from "../api/api";
import Imagex from "../components/base/Imagex";
import { createElement } from "../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "./imagePaths.js";

const adCache = {};
const adIntervals = new Map();
const DISPLAY_TIME = 5000; // rotate every 5s

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function renderRollingAd(container, ads, index) {
  clearContainer(container);

  const currentAd = ads[index];
  const imageUrl = resolveImagePath(EntityType.ADVT, PictureType.THUMB, currentAd.image);

  const adArea = createElement("div", { class: "rolling-ad-area" }, [
    createElement(
      "a",
      {
        href: currentAd.link,
        target: "_blank",
        rel: "noopener",
        class: "rolling-ad-link",
      },
      [
        Imagex({
          src: imageUrl,
          alt: currentAd.title,
          loading: "lazy",
          style: "width:100%;height:auto;object-fit:cover;border-radius:6px;",
        }),
        createElement("div", { class: "rolling-ad-caption" }, [
          createElement("h3", {}, [currentAd.title]),
          createElement("p", {}, [currentAd.description]),
        ]),
      ]
    ),
  ]);

  container.appendChild(adArea);
}

function startRolling(container, ads) {
  let index = 0;
  renderRollingAd(container, ads, index);

  if (adIntervals.has(container)) {
    clearInterval(adIntervals.get(container));
  }

  const intervalId = setInterval(() => {
    index = (index + 1) % ads.length;

    const currentAd = container.querySelector(".rolling-ad-area");
    if (currentAd) {
      currentAd.classList.remove("fade-in");
      currentAd.classList.add("fade-out");
      setTimeout(() => {
        renderRollingAd(container, ads, index);
        container.firstChild.classList.add("fade-in");
      }, 500);
    } else {
      renderRollingAd(container, ads, index);
    }
  }, DISPLAY_TIME);

  adIntervals.set(container, intervalId);

  container.addEventListener("mouseenter", () => clearInterval(intervalId));
  container.addEventListener("mouseleave", () => startRolling(container, ads));
}

function loadAndDisplayRollingAds(container, category = "default") {
  if (adCache[category]) {
    startRolling(container, adCache[category]);
    return;
  }

  apiFetch(`/sda/sda?category=${category}`)
    .then((ads) => {
      if (!ads.length) {
        container.remove();
        return;
      }
      adCache[category] = ads;
      startRolling(container, ads);
    })
    .catch((error) => {
      console.error(`Error fetching rolling ads for category '${category}':`, error);
      container.remove();
    });
}

export function initRollingAds() {
  const adElements = document.querySelectorAll(".rolling-advertisement");
  if (adElements.length === 0) {
    console.warn("No rolling advertisement containers found!");
    return;
  }

  adElements.forEach((container) => {
    const category = container.getAttribute("data-category") || "default";
    loadAndDisplayRollingAds(container, category);
  });
}

/* CSS to include:
.rolling-ad-area {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  transition: opacity 0.5s ease-in-out;
}
.rolling-ad-area.fade-in {
  opacity: 1;
}
.rolling-ad-area.fade-out {
  opacity: 0;
}
.rolling-ad-link {
  display: block;
  text-decoration: none;
  color: inherit;
}
.rolling-ad-caption {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
}
*/
