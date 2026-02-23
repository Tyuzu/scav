import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { formatRelativeTime } from "../../../utils/dateUtils.js";
import { saveJob } from "./utils.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

export function buildCard(job) {
  const bannerFilename = job.banner || "placeholder.jpg";
  const imgSrc = resolveImagePath(EntityType.BAITO, PictureType.THUMB, bannerFilename);

  const wageText = job.wage ? `💴 ¥${Number(job.wage).toLocaleString()}/hr` : "💴 Not specified";
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const typeInfo = job.type ? `🕒 ${job.type}` : "";
  const shift = job.shift ? `• ${job.shift}` : "";

  const saveBtn = Button("Save", `save-${job.baitoid}`, {
    click: () => saveJob(job.baitoid)
  }, "buttonx btn-bookmark");

  const badgeTags = tags.length
    ? createElement("div", { class: "baito-tags" }, tags.map(tag =>
      createElement("span", { class: "baito-tag" }, [`#${tag}`])
    ))
    : null;

  const img = Imagex({
    src: imgSrc,
    alt: job.title || "baito banner",
    loading: "lazy",
    classes: "baito-banner-thumb"
  });

  // img.onerror = () => {
  //   img.src = resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.jpg");
  // };

  const imageWrapper = createElement("div", {
    "events": {
      click: () => { navigate(`/baito/${job.baitoid}`) }
    }, class: "baito-card-img"
  }, [img]);

  const contentWrapper = createElement("div", { class: "baito-card-content" }, [
    createElement("h3", { class: "baito-title" }, [job.title || "Untitled"]),
    createElement("p", { class: "baito-company" }, [job.company ? `🏢 ${job.company}` : "🏢 Unknown"]),
    createElement("p", { class: "baito-meta" }, [
      `${wageText}`
    ]),
    createElement("p", { class: "baito-meta" }, [
      `📁 ${job.category || "?"} › ${job.subcategory || "?"}`
    ]),
    createElement("p", { class: "baito-type-shift" }, [typeInfo, " ", shift]),
    createElement("p", { class: "baito-loc-time" }, [
      `📍 ${job.location || "Unknown"} • ${formatRelativeTime(job.createdAt)}`
    ]),
    ...(badgeTags ? [badgeTags] : []),
    createElement("div", { class: "baito-actions" }, [
      Button("View Details", `view-${job.baitoid}`, {
        click: () => navigate(`/baito/${job.baitoid}`)
      }, "buttonx btn-secondary"),
      saveBtn
    ])
  ]);

  return createElement("div", { class: "baito-card" }, [
    imageWrapper,
    contentWrapper
  ]);
}
