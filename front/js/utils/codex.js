// sdacript.js (module)

import { apiFetch } from "../api/api";
import Imagex from "../components/base/Imagex";
import { createElement } from "../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "./imagePaths.js";

const adCache = {};
const adIntervals = new Map();
const DISPLAY_TIME = 10000;

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function renderAd(container, ad) {
  clearContainer(container);

  const imageUrl = resolveImagePath(EntityType.ADVT, PictureType.THUMB, ad.image);

  const adCard = createElement("div", { class: "ad-card fade-in" }, [
    Imagex({
      src: imageUrl,
      alt: ad.title,
      loading: "lazy",
      style: "aspect-ratio:7/3;object-fit:cover",
    }),
    createElement("div", { class: "ad-content" }, [
      createElement("h3", {}, [ad.title]),
      createElement("p", {}, [ad.description]),
      createElement(
        "a",
        {
          href: ad.link,
          target: "_blank",
          rel: "noopener",
        },
        ["Learn More"]
      ),
    ]),
    createElement("div", { class: "ad-progress" }),
  ]);

  container.appendChild(adCard);

  const progress = adCard.querySelector(".ad-progress");
  if (progress) {
    progress.style.animation = `progressAnim ${DISPLAY_TIME / 1000}s linear forwards`;
  }
}

function loadAndDisplayAds(container, category = "default") {
  if (adCache[category]) {
    startRotation(container, adCache[category]);
    return;
  }

  apiFetch(`/sda/sda?category=${category}`)
    .then((ads) => {
      if (!ads.length) {
        container.remove(); // remove whole ad section
        return;
      }
      adCache[category] = ads;
      startRotation(container, ads);
    })
    .catch((error) => {
      console.error(`Error fetching ads for category '${category}':`, error);
      container.remove(); // also remove on error
    });
}

function startRotation(container, ads) {
  let index = 0;
  renderAd(container, ads[index]);

  if (adIntervals.has(container)) {
    clearInterval(adIntervals.get(container));
  }

  const intervalId = setInterval(() => {
    index = (index + 1) % ads.length;
    const currentAd = container.querySelector(".ad-card");
    if (currentAd) {
      currentAd.classList.remove("fade-in");
      currentAd.classList.add("fade-out");
      setTimeout(() => {
        renderAd(container, ads[index]);
      }, 500);
    } else {
      renderAd(container, ads[index]);
    }
  }, DISPLAY_TIME);

  adIntervals.set(container, intervalId);

  container.addEventListener("mouseenter", () => clearInterval(intervalId));
  container.addEventListener("mouseleave", () =>
    startRotation(container, ads)
  );
}

// 🚀 exported init function
export function initAds() {
  const adElements = document.querySelectorAll(".advertisement");
  if (adElements.length === 0) {
    console.warn("No advertisement containers found!");
    return;
  }

  adElements.forEach((container) => {
    const category = container.getAttribute("data-category") || "default";
    loadAndDisplayAds(container, category);
  });
}
