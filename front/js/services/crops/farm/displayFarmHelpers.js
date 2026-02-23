import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { editCrop } from "../crop/editCrop.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { addToCart } from "../../cart/addToCart.js";
import { EntityType } from "../../../utils/imagePaths.js";
import { editFarm } from "./editFarm.js";
import Bannerx from "../../../components/base/Bannerx.js";

// ─────────── Farm details ───────────
export function renderFarmDetails(farm, isCreator) {
  const daysAgo = getAgeInDays(farm.updatedAt);
  const freshness =
    daysAgo < 2
      ? "🟢 Updated today"
      : daysAgo < 7
      ? "🟡 Updated this week"
      : `🔴 Updated ${daysAgo} days ago`;

  const actions = createElement("div", { class: "farm-actions" });

  if (isCreator) {
    actions.append(
      Button("✏️ Edit", `edit-${farm.farmid}`, {
        click: () => editFarm(true, farm)
      }, "buttonx"),
      Button("🗑️ Delete", `delete-${farm.farmid}`, {
        click: async () => {
          const ok = window.confirm?.(`Delete farm "${farm.name}"?`);
          if (!ok) return;

          const res = await apiFetch(`/farms/${farm.farmid}`, "DELETE");
          if (res?.success) navigate("/farms");
        }
      }, "buttonx")
    );
  }

  return createElement("div", { class: "farm-detail" }, [
    createElement("h2", {}, [farm.name || "Farm"]),
    createElement("p", {}, [`📍 Location: ${farm.location || "N/A"}`]),
    createElement("p", {}, [`📃 Description: ${farm.description || "N/A"}`]),
    createElement("p", {}, [`👤 Owner: ${farm.owner || "N/A"}`]),
    createElement("p", {}, [`📞 Contact: ${farm.contact || "N/A"}`]),
    farm.practice && createElement("p", {}, [`🌱 Practice: ${farm.practice}`]),
    farm.social && createElement("p", {}, [
      "🔗 ",
      createElement("a", {
        href: farm.social,
        target: "_blank",
        rel: "noopener"
      }, ["Visit farm page"])
    ]),
    createElement("p", {}, [freshness]),
    actions
  ].filter(Boolean));
}

// ─────────── Crop summary ───────────
export function renderCropSummary(crops) {
  const total = crops.length;
  const inStock = crops.filter(c => c.quantity > 0).length;
  const avgPrice = (
    crops.reduce((sum, c) => sum + (c.price || 0), 0) / (total || 1)
  ).toFixed(2);

  return createElement("div", { class: "crop-summary" }, [
    createElement("p", {}, [`🌱 ${total} crops`]),
    createElement("p", {}, [`📦 ${inStock} in stock`]),
    createElement("p", {}, [`💸 Avg. price: ₹${avgPrice}`])
  ]);
}

// ─────────── Crop emoji distribution ───────────
export function renderCropEmojiMap(crops) {
  const emoji = ["🥔", "🌾", "🍅", "🌽", "🥬", "🍆"];
  const counts = {};

  for (const c of crops) {
    const name = c.name || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  }

  return createElement("div", { class: "crop-distribution" }, [
    createElement("strong", {}, ["🗺️ Crop Distribution"]),
    ...Object.entries(counts).map(([name, cnt], i) =>
      createElement("p", {}, [`${emoji[i % emoji.length]} ${name}: ${cnt}`])
    )
  ]);
}

// ─────────── Sort dropdown ───────────
export function createSortDropdown(onChange) {
  const opts = [
    ["name", "Sort by Name"],
    ["price", "Sort by Price"],
    ["quantity", "Sort by Quantity"],
    ["age", "Sort by Harvest Age"]
  ];

  const select = createElement(
    "select",
    { class: "crop-sort-select" },
    opts.map(([val, label]) =>
      createElement("option", { value: val }, [label])
    )
  );

  select.onchange = () => onChange(select.value);
  return select;
}

// ─────────── Crop list ───────────
export async function renderCrops(
  farm,
  cropsContainer,
  farmId,
  mainCon,
  editcon,
  isLoggedIn,
  sortBy = "name",
  isCreator = false
) {
  cropsContainer.replaceChildren();

  if (!farm.crops?.length) {
    cropsContainer.append(
      createElement("p", {}, ["No crops listed yet."])
    );
    return;
  }

  const sorted = sortCrops(farm.crops, sortBy);

  for (const crop of sorted) {
    cropsContainer.append(
      createCropCard(
        crop,
        farm.name,
        farmId,
        mainCon,
        editcon,
        isLoggedIn,
        isCreator
      )
    );
  }
}

// ─────────── Banner ───────────
function createCropBannerSection(crop, isCreator) {
  return Bannerx({
    isCreator,
    bannerkey: crop.banner,
    banneraltkey: `Banner for ${crop.name || "Crop"}`,
    bannerentitytype: EntityType.CROP,
    stateentitykey: "crop",
    bannerentityid: String(crop.cropid)
  });
}

// ─────────── Crop card ───────────
function createCropCard(crop, farmName, farmId, mainCon, editcon, isLoggedIn, isCreator) {
  const card = createElement("div", { class: "crop-card" });

  const harvestAge =
    crop.harvestDate
      ? `${getAgeInDays(crop.harvestDate)} days old`
      : "Unknown age";

  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(crop.price || 0);

  card.append(
    createCropBannerSection(crop, isCreator),
    createElement("h4", {}, [crop.name || "Crop"]),
    createElement("p", {}, [`💰 ${price} per ${crop.unit || "unit"}`]),
    createElement("p", {}, [`📦 Stock: ${crop.quantity ?? 0}`]),
    createElement("p", {}, [`🕓 Harvested: ${harvestAge}`]),
    createElement("p", {}, [
      crop.quantity > 0 ? "✅ Available" : "❌ Out of Stock"
    ])
  );

  if (crop.history?.length > 1) {
    card.append(...createPriceHistoryToggle(crop.history));
  }

  card.append(
    ...(isCreator
      ? createCreatorControls(crop, farmId, editcon)
      : createUserControls(crop, farmName, farmId, isLoggedIn))
  );

  return card;
}

// ─────────── Price history ───────────
function createPriceHistoryToggle(history) {
  const toggle = createElement("button", {}, ["📈 Show Price History"]);
  const block = createElement("pre", { class: "price-history hidden" }, [
    history.map(p => `${p.date}: ₹${p.price}`).join("\n")
  ]);

  toggle.onclick = () => block.classList.toggle("hidden");
  return [toggle, block];
}

// ─────────── Creator controls ───────────
function createCreatorControls(crop, farmId, editcon) {
  return [
    Button("✏️ Edit", "", {
      click: () => {
        editcon.replaceChildren();
        editCrop(farmId, crop, editcon);
      }
    }, "buttonx"),
    Button("🗑️ Delete", "", {
      click: async () => {
        const ok = window.confirm?.(`Delete crop "${crop.name}"?`);
        if (!ok) return;

        const res = await apiFetch(
          `/farms/${farmId}/crops/${crop.cropid}`,
          "DELETE"
        );

        if (res?.success) {
          editcon.replaceChildren(
            createElement("p", {}, ["❌ Crop deleted"])
          );
        }
      }
    }, "buttonx")
  ];
}

// ─────────── User controls ───────────
export function createUserControls(crop, farmName, farmId, isLoggedIn) {
  let quantity = 1;
  const maxQty = crop.quantity ?? 0;

  const display = createElement("span", {}, [String(quantity)]);
  const inc = createElement("button", {}, ["+"]);
  const dec = createElement("button", {}, ["−"]);

  inc.onclick = () => {
    if (quantity < maxQty) {
      quantity++;
      display.replaceChildren(String(quantity));
    }
  };

  dec.onclick = () => {
    if (quantity > 1) {
      quantity--;
      display.replaceChildren(String(quantity));
    }
  };

  return [
    createElement("label", {}, ["Quantity:"]),
    createElement("div", { class: "quantity-control" }, [dec, display, inc]),
    Button("Add-To-Cart", "a2c-crop-crd", {
      click: () =>
        addToCart({
          itemId: crop.cropid,
          quantity,
          isLoggedIn
        })
    }, "buttonx")
  ];
}

// ─────────── Sorting ───────────
function sortCrops(crops, sortBy) {
  return [...crops].sort((a, b) => {
    switch (sortBy) {
      case "price": return understanding(a.price) - understanding(b.price);
      case "quantity": return (b.quantity || 0) - (a.quantity || 0);
      case "age":
        return getAgeInDays(b.harvestDate) - getAgeInDays(a.harvestDate);
      case "name":
      default:
        return (a.name || "").localeCompare(b.name || "");
    }
  });
}

function understanding(v) {
  return typeof v === "number" ? v : 0;
}

// ─────────── Date utility ───────────
function getAgeInDays(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}