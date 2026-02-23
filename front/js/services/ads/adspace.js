import { createElement } from "../../components/createElement.js";
import { t } from "../../i18n/i18n.js";

let adCounter = 0;

/**
 * Embed an advertisement slot with optional lazy-loading.
 * @param {string} page - Page identifier (e.g., "homepage")
 * @param {string} position - Slot position (e.g., "top", "sidebar")
 * @param {object} options - Optional configs:
 *   classes: additional CSS classes
 *   fallbackText: text shown if ad fails
 *   adNetworkInit: function(slotEl) {} to initialize real ad (e.g., AdSense)
 *   debug: boolean to log slot creation
 */
export function advertEmbed(page, position = "", options = {}) {
  adCounter++;

  const {
    classes = "",
    fallbackText = t("advertisement", {}, "Advertisement"),
    adNetworkInit = null,
    debug = false
  } = options;

  const slotId = `ad-slot-${page}-${Date.now()}-${adCounter}`;

  const slotEl = createElement("div", {
    id: slotId,
    class: `ad-slot ${classes}`.trim(),
    "data-page": page,
    "data-position": position
  }, [
    createElement("span", { class: "ad-fallback" }, [fallbackText])
  ]);

  if (debug) {
    console.log("Ad slot created:", slotId, "page:", page, "position:", position);
  }

  // Lazy-load ad when the slot enters the viewport
  if (adNetworkInit && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          try {
            adNetworkInit(slotEl);
          } catch (err) {
            console.error("Ad network failed:", err);
          }
          obs.unobserve(slotEl);
        }
      });
    }, { rootMargin: "200px" }); // preload a bit before visibility
    observer.observe(slotEl);
  } else if (adNetworkInit) {
    // Fallback: immediately initialize if IntersectionObserver not supported
    try {
      adNetworkInit(slotEl);
    } catch (err) {
      console.error("Ad network failed:", err);
    }
  }

  return slotEl;
}


// const homepageAd = advertEmbed("homepage", "top", {
//   classes: "banner-ad",
//   adNetworkInit: (slot) => {
//     // Example: AdSense slot initialization
//     const ins = document.createElement("ins");
//     ins.className = "adsbygoogle";
//     ins.style.display = "block";
//     ins.setAttribute("data-ad-client", "ca-pub-XXXX");
//     ins.setAttribute("data-ad-slot", "YYYY");
//     slot.appendChild(ins);
//     (adsbygoogle = window.adsbygoogle || []).push({});
//   },
//   debug: true
// });

// document.body.appendChild(homepageAd);
