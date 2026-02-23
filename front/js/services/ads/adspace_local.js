import { createElement } from "../../components/createElement.js";
import { t } from "../../i18n/i18n.js";

let adCounter = 0;

export function advertEmbed(page, position = "", options = {}) {
  adCounter++;

  const { classes = "", fallbackText = t("advertisement", {}, "Advertisement") } = options;

  const slotId = `ad-slot-${page}-${Date.now()}-${adCounter}`;

  return createElement("div", {
    id: slotId,
    class: `ad-slot ${classes}`.trim(),
    "data-page": page,
    "data-position": position
  }, [
    createElement("span", { class: "ad-fallback" }, [fallbackText])
  ]);
}
