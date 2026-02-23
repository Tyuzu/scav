import { createElement } from "../../../components/createElement.js";
import { SRC_URL, apiFetch } from "../../../api/api.js";
import { getState } from "../../../state/state.js";
import { navigate } from "../../../routes/index.js";
import { createOrEditBaito } from "../create/createOrEditBaito.js";
import Button from "../../../components/base/Button.js";
import { showApplicantsModal } from "../dash/BaitoDash.js";
import { ImageGallery } from "../../../components/ui/IMageGallery.mjs";
import { displayReviews } from "../../reviews/displayReviews.js";
import Notify from "../../../components/ui/Notify.mjs";
import { meChat } from "../../mechat/plugnplay.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
// import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
// import Sightbox from "../../../components/ui/SightBox.mjs";
import Imagex from "../../../components/base/Imagex.js";
import Bannerx from "../../../components/base/Bannerx.js";
import { baitoAddImages } from "../create/AddBaitoImages.js";
import Datex from "../../../components/base/Datex.js";

/** Open chat with employer */
function startChatWithEmployer(userId, baitoId) {
  meChat(userId, "baito", baitoId);
}

/** Notify stubs */
function uploadResumeFeature() {
  Notify("Resume upload feature is under development.", { type: "info", duration: 3000, dismissible: true });
}
function storeApplicationHistory(baitoId) {
  Notify(`Application history coming soon.`, { type: "info", duration: 3000, dismissible: true });
}

/** Expandable description */
function renderExpandableDescription(text = "") {
  const descP = createElement("p", { class: "baito-description" });
  const isLong = text.length > 300;
  descP.textContent = isLong ? text.slice(0, 300) + "…" : text;

  if (!isLong) return descP;

  const btn = Button("Show More", "toggle-desc", {
    click: () => {
      descP.textContent = text;
      btn.remove();
    }
  }, "btn btn-secondary");

  return createElement("div", {}, [descP, btn]);
}

/** Edit job wrapper */
function editBaito(baito, isLoggedIn, container) {
  createOrEditBaito({ isLoggedIn, contentContainer: container, baito, mode: "edit" });
}

/** Owner controls */
function renderOwnerControls(baito, container, isLoggedIn) {
  return createElement("div", { class: "baito-owner-controls" }, [
    Button("✏️ Edit Job", "baito-edit-btn", { click: () => editBaito(baito, isLoggedIn, container) }, "buttonx btn-secondary"),
    Button(`📨 View Applicants (${baito.applicationcount || 0})`, "view-applicants-btn", { click: () => showApplicantsModal(baito) }, "buttonx btn-secondary"),
    Button("🗑 Delete Job", "delete-baito-btn", {
      click: async () => {
        if (!confirm("Delete this job permanently?")) return;
        try {
          await apiFetch(`/baitos/baito/${baito.baitoid}`, "DELETE");
          Notify("✅ Deleted", { type: "success", duration: 3000, dismissible: true });
          navigate("/baitos");
        } catch {
          Notify("❌ Failed to delete.", { type: "error", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-danger"),
    Button("Chats", "chats-btn-baito", { click: () => navigate("/merechats") }, "buttonx btn-secondary"),
    Button("Close job", "close-btn-baito", { click: () => {
      alert("TODO close job");
    } }, "buttonx btn-secondary"),
  ]);
}

/** Applicant controls */
function renderApplicantControls(baito, baitoid, isOwner, container, isLoggedIn) {
  const expired = baito.lastdate && new Date(baito.lastdate) < new Date();
  return createElement("div", { class: "baito-user-controls" }, [
    Button(expired ? "⏳ Job Expired" : "📩 Apply / Contact", "apply-btn", {
      click: async (e) => {
        if (expired) return Notify("This job is no longer accepting applications.", { type: "warning", duration: 3000, dismissible: true });
        if (!isLoggedIn) return Notify("Please log in to apply for this job.", { type: "warning", duration: 3000, dismissible: true });
        const pitch = prompt("Write a short message to the employer:");
        if (!pitch?.trim()) return Notify("Application cancelled.", { type: "success", duration: 3000, dismissible: true });

        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "Applying...";

        try {
          const form = new FormData();
          form.append("pitch", pitch.trim());
          const res = await apiFetch(`/baitos/baito/${baitoid}/apply`, "POST", form);
          Notify(res.success ? "✅ Application sent!" : res.message, { type: "success", duration: 3000, dismissible: true });
          btn.textContent = "Applied";
        } catch {
          Notify("❌ Failed to apply.", { type: "error", duration: 3000, dismissible: true });
          btn.disabled = false;
          btn.textContent = "📩 Apply / Contact";
        }
      }
    }, `buttonx btn-primary${expired ? " disabled" : ""}`),

    Button("⭐ Save Job", "save-job-btn", {
      click: () => {
        const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        if (!saved.includes(baito.baitoid)) {
          saved.push(baito.baitoid);
          localStorage.setItem("savedJobs", JSON.stringify(saved));
          Notify("Saved!", { type: "success", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-bookmark"),

    Button("🚩 Report Listing", "report-btn", {
      click: async () => {
        const reason = prompt("Why are you reporting this job?");
        if (!reason?.trim()) return;
        try {
          await apiFetch(`/baitos/baito/${baitoid}/report`, "POST", { reason: reason.trim() });
          Notify("✅ Report submitted", { type: "success", duration: 3000, dismissible: true });
        } catch {
          Notify("❌ Failed to report", { type: "error", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-danger"),

    Button("💬 Chat with Employer", "chat-btn", { click: () => startChatWithEmployer(baito.ownerId, baitoid) }, "buttonx btn-secondary"),
    Button("📎 Upload Resume", "upload-resume-btn", { click: uploadResumeFeature }, "buttonx btn-secondary"),
    Button("💬 Reviews", "leave-review-btn", { click: () => displayReviews(container, isOwner, isLoggedIn, "baito", baitoid) }, "buttonx btn-secondary")
  ]);
}

/** Fetch related jobs */
async function fetchSimilarJobs(category, excludeId) {
  try {
    const jobs = await apiFetch(`/baitos/related?category=${category}&exclude=${excludeId}`) || [];
    return jobs.filter(j => j.baitoid !== excludeId); // ensure exclude works
  } catch {
    console.warn("Failed to load similar jobs");
    return [];
  }
}

/** Employer info */
function createEmployerSection(employer, baito) {
  if (!employer) {
    // fallback: show ownerId
    return createElement("div", { class: "baito-employer" }, [
      createElement("span", {}, [`Employer ID: ${baito.ownerId}`])
    ]);
  }
  const avatar = employer.avatar ? Imagex({ src: employer.avatar, alt: "Employer", classes: "employer-avatar" }) : null;
  const name = createElement("span", {}, [employer.name || "Anonymous Employer"]);
  const verifiedBadge = employer.verified ? createElement("span", { class: "verified-badge" }, ["✅ Verified"]) : null;
  return createElement("div", { class: "baito-employer" }, [avatar, name, verifiedBadge].filter(Boolean));
}


/** Job meta info */
function createMetaSection(baito) {
  const wageText = isNaN(Number(baito.wage)) ? baito.wage : `¥${Number(baito.wage).toLocaleString()}/hour`;

  const metaLines = [
    baito.category && baito.subcategory ? `📂 ${baito.category} › ${baito.subcategory}` : baito.category ? `📂 ${baito.category}` : null,
    baito.wage ? `💴 Wage: ${wageText}` : null,
    baito.workHours ? `⏰ Hours: ${baito.workHours}` : null,
    baito.location ? `📍 Location: ${baito.location}` : null,
    baito.phone ? `📞 Contact: ${baito.phone}` : null,
    // baito.lastdate ? `⏳ Apply by: ${new Date(baito.lastdate).toLocaleDateString()}` : null,
    baito.lastdate ? `⏳ Apply by: ${Datex(baito.lastdate, true)}` : null,
    // baito.createdAt ? `📅 Posted: ${new Date(baito.createdAt).toLocaleDateString()}` : null,
    baito.createdAt ? `📅 Posted: ${Datex(baito.createdAt, true)}` : null,
    typeof baito.applicationcount === "number" ? `👥 Applications: ${baito.applicationcount}` : null,
  ].filter(Boolean);

  return createElement("div", { class: "baito-meta" }, metaLines.map(line => createElement("p", {}, [line])));
}

/** Tags section */
function createTagsSection(tags) {
  if (!Array.isArray(tags) || !tags.length) return null;
  return createElement("div", { class: "baito-tags" }, tags.map(tag => createElement("span", { class: "baito-tag" }, [`#${tag.trim()}`])));
}

/** Requirements section */
function createRequirementsSection(requirements) {
  if (!requirements || (Array.isArray(requirements) && !requirements.length)) return null;
  const reqs = Array.isArray(requirements) ? requirements : [requirements];
  return createElement("div", { class: "baito-reqs" }, [
    createElement("strong", {}, ["📌 Requirements"]),
    createElement("ul", {}, reqs.map(r => createElement("li", {}, [r]))),
  ]);
}

/** Banner section */
function createBaitoBannerSection(baito, isCreator) {
  return Bannerx({
    isCreator: isCreator,
    bannerkey: baito.banner,
    banneraltkey: `Banner for ${baito.name || "Baito"}`,
    bannerentitytype: EntityType.BAITO,
    stateentitykey: "baito",
    bannerentityid: baito.baitoid
  });
}

/** Similar jobs section with improved cards */
async function appendSimilarJobs(section, category, excludeId) {
  const similarJobs = await fetchSimilarJobs(category, excludeId);
  if (!similarJobs.length) return;

  const details = createElement("details", { class: "baito-related-details" }, [
    createElement("summary", {}, ["🔎 Similar Jobs"]),
  ]);

  similarJobs.slice(0, 4).forEach(job => {
    const wageText = isNaN(Number(job.wage)) ? job.wage : `¥${Number(job.wage).toLocaleString()}/hour`;
    const bannerSrc = job.banner
      ? resolveImagePath(EntityType.BAITO, PictureType.BANNER, job.banner)
      : `${SRC_URL}/images/placeholder-banner.png`; // fallback placeholder

    const card = createElement("div", { class: "baito-related-card card" }, [
      // Banner image
      Imagex({ src: bannerSrc, alt: job.title || "Job Banner", classes: "related-card-banner" }),
      // Content container
      createElement("div", { class: "related-card-content" }, [
        createElement("h4", { class: "related-card-title" }, [job.title || "Untitled"]),
        job.location ? createElement("p", { class: "related-card-location" }, [`📍 ${job.location}`]) : null,
        job.wage ? createElement("p", { class: "related-card-wage" }, [`💴 ${wageText}`]) : null,
        Button("View", "", { click: () => navigate(`/baito/${job.baitoid}`) }, "btn btn-sm btn-primary related-card-btn"),
      ].filter(Boolean)),
    ]);

    details.appendChild(card);
  });

  section.appendChild(details);
}


/** Main display function */
export async function displayBaito(isLoggedIn, baitoid, contentContainer) {
  contentContainer.replaceChildren();
  try {
    const baito = await apiFetch(`/baitos/baito/${baitoid}`);
    if (!baito) throw new Error("Baito not found");

    const isOwner = getState("user") === baito.ownerId;

    const section = createElement("div", { class: "baito-detail" });
    section.appendChild(createElement("h2", { class: "baito-title" }, [baito.title || "Untitled Job"]));

    section.appendChild(createBaitoBannerSection(baito, isOwner));

    const employerSection = createEmployerSection(baito.employer, baito);
    if (employerSection) section.appendChild(employerSection);

    section.appendChild(createMetaSection(baito));

    const tagsSection = createTagsSection(baito.tags);
    if (tagsSection) section.appendChild(tagsSection);

    const reqSection = createRequirementsSection(baito.requirements);
    if (reqSection) section.appendChild(reqSection);

    if (baito.description) section.appendChild(renderExpandableDescription(baito.description));

    // section.appendChild(createBannerSection(baito, isOwner));

    const cleanImageNames = baito.images?.filter(Boolean) || [];
      section.appendChild(Button("Add images", "", {
        click: () => { baitoAddImages({ isLoggedIn, contentContainer, baito, mode: "edit" }) }
      }));
    if (cleanImageNames.length) {
      const fullURLs = cleanImageNames.map(name => resolveImagePath(EntityType.BAITO, PictureType.PHOTO, name));
      section.appendChild(ImageGallery(fullURLs));
    }

    // Review container
    const reviewSec = createElement("div", {}, []);

    // Controls: owner sees edit, delete, view applicants
    const controls = isOwner
      ? renderOwnerControls(baito, contentContainer, isLoggedIn)
      : renderApplicantControls(baito, baitoid, isOwner, reviewSec, isLoggedIn);

    section.appendChild(controls);
    section.appendChild(reviewSec);

    if (baito.coords?.lat && baito.coords?.lng) {
      section.appendChild(createElement("iframe", {
        src: `https://maps.google.com/maps?q=${baito.coords.lat},${baito.coords.lng}&z=15&output=embed`,
        width: "100%",
        height: "300",
        class: "baito-map",
        loading: "lazy",
        allowfullscreen: true,
      }));
    }

    await appendSimilarJobs(section, baito.category, baitoid);

    contentContainer.appendChild(section);
  } catch (error) {
    contentContainer.appendChild(createElement("p", {}, ["🚫 Unable to load job details. Please try again later."]));
    console.error("Failed to fetch baito:", error);
  }
}
