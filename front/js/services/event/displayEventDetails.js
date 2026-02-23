import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { editEvent } from "./creadit.js";
import { deleteEvent } from "./eventService.js";
import { viewEventAnalytics } from "./eventAnalytics.js";
import { reportPost } from "../reporting/reporting.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
// import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import { starEmptySVG, starFilledSVG } from "../../components/svgs.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { hireVendors } from "../jobs/vendors/vendors.js";
// import Imagex from "../../components/base/Imagex.js";
import Bannerx from "../../components/base/Bannerx.js";
import Datex from "../../components/base/Datex.js";


// Config for displaying event details
const fieldConfig = [
    { key: 'title', tag: 'h1', classes: ['event-title'] },
    { key: 'status', tag: 'p', classes: ['event-status'] },
    { key: 'date', tag: 'p', classes: ['event-date'], formatter: d => Datex(d) },
    // { key: 'date', tag: 'p', classes: ['event-date'], formatter: d => new Date(d).toLocaleString() },
    { key: 'description', tag: 'p', classes: ['event-description'] },
];

const getEventColorClass = type => {
    switch (type?.toLowerCase()) {
        case 'concert': return 'color-concert';
        case 'workshop': return 'color-workshop';
        case 'sports': return 'color-sports';
        case 'meetup': return 'color-meetup';
        case 'festival': return 'color-festival';
        default: return 'color-default';
    }
};

const createDetailItems = (config, data) => {
    const details = createElement("div", { class: "eventpage-details" });
    config.forEach(({ key, label, tag, classes, formatter }) => {
        let value = data[key];
        if (!value) return;
        if (formatter) value = formatter(value);
        details.appendChild(createElement(tag, { class: classes.join(" ") }, [label ? `${label}: ${value}` : value]));
    });
    return details;
};

const createTags = tags => {
    if (!tags?.length) return null;
    const container = createElement("div", { class: "event-tags" });
    tags.forEach(tag => container.appendChild(createElement("span", { class: 'event-tag' }, [`#${tag}`])));
    return container;
};

const createSocialLinks = links => {
    if (!links) return null;
    const container = createElement("div", { class: "event-social-links" });
    Object.entries(links).forEach(([platform, url]) => {
        container.appendChild(createElement("a", { href: url, class: "social-link" }, [platform]));
    });
    return container;
};

const createCustomFields = fields => {
    if (!fields) return null;
    const container = createElement("div", { class: "event-custom-fields" });
    Object.entries(fields).forEach(([field, value]) => {
        container.appendChild(createElement('p', { class: 'custom-field' }, [`${field}: ${value}`]));
    });
    return container;
};

// Save/unsave
const getSavedEvents = () => {
    try { return JSON.parse(localStorage.getItem("saved_events") || "[]"); }
    catch { return []; }
};
const toggleSaveEvent = id => {
    let saved = getSavedEvents();
    if (saved.includes(id)) saved = saved.filter(eid => eid !== id);
    else saved.push(id);
    localStorage.setItem("saved_events", JSON.stringify(saved));
};

const createSaveButton = eventid => {
    let fillStar = createIconButton({
        svgMarkup: starFilledSVG,
        classSuffix: ""
    });
    let emptyStar = createIconButton({
        svgMarkup: starEmptySVG,
        classSuffix: ""
    });
    const icon = createElement("span", {
        title: "Save Event"
    }, [getSavedEvents().includes(eventid) ? fillStar : emptyStar]);

    icon.addEventListener("click", () => {
        toggleSaveEvent(eventid);
        const nowSaved = getSavedEvents().includes(eventid);
        icon.replaceChildren(nowSaved ? fillStar : emptyStar);
    });
    return icon;
};

// Share
const createShareButton = eventid => {
    const btn = Button("Share", "", {
        click: () => {
            navigator.clipboard.writeText(location.origin + `/event/${eventid}`);
            btn.replaceChildren("Link Copied");
            setTimeout(() => btn.replaceChildren("Share"), 1500);
        }
    }, "share-btn");
    return btn;
};

// Status badge
const createStatusBadge = eventDate => {
    const now = Date.now();
    const time = new Date(eventDate).getTime();
    const isPast = time < now;
    return createElement("span", {
        style: `font-size:0.75rem;padding:2px 6px;border-radius:4px;background:${isPast ? "#999" : "darkgreen"};color:white;margin-left:8px;`
    }, [isPast ? "Past" : "Upcoming"]);
};

// Countdown
const createCountdown = eventDate => {
    const msLeft = new Date(eventDate).getTime() - Date.now();
    if (msLeft <= 0) return null;
    const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(msLeft / (1000 * 60 * 60)) % 24;
    return createElement("p", { class: "event-countdown" }, [`Starts in ${days > 0 ? days + " day(s)" : hours + " hour(s)"}`]);
};

// Place link
const createPlaceLink = (placename, placeid) => createElement('p', {}, [
    createElement('a', { href: `/place/${placeid}` }, [createElement('strong', {}, [`Place: ${placename}`])])
]);


/** Banner section */
function createEventBannerSection(eventdata, isCreator) {
    return Bannerx({
      isCreator : isCreator,
      bannerkey : eventdata.banner,
      banneraltkey : `Banner for ${eventdata.name || "Event"}`,
      bannerentitytype : EntityType.EVENT,
      stateentitykey : "event",
      bannerentityid : eventdata.eventid
    });
  }
  

// Info section
function createInfoSection(eventData, isCreator, isLoggedIn) {
    const eventInfo = createElement("div", { class: "event-info" });
    const topRow = createElement("div", { class: "event-header-row" });
    const detailBlock = createDetailItems(fieldConfig, eventData);
    const statusBadge = createStatusBadge(eventData.date);
    const countdown = createCountdown(eventData.date);
    const saveBtn = createSaveButton(eventData.eventid);
    const shareBtn = createShareButton(eventData.eventid);

    topRow.append(detailBlock, statusBadge, saveBtn);

    const actions = [];

    let evanacon = createElement("div", {}, []);
    
    if (isLoggedIn && isCreator) {
        actions.push({ text: '✏ Edit Event', onClick: () => editEvent(isLoggedIn, eventData.eventid, document.getElementById("editevent")), classes: ['edit-btn', "buttonx"] });
        actions.push({ text: '🗑 Delete Event', onClick: () => deleteEvent(isLoggedIn, eventData.eventid), classes: ['delete-btn', 'buttonx'] });
        actions.push({ text: '📊 View Analytics', onClick: () => viewEventAnalytics(evanacon, isLoggedIn, eventData.eventid), classes: ['analytics-btn', "buttonx"] });
        actions.push({ text: 'Hire Vendors', onClick: () => hireVendors(evanacon, isLoggedIn, eventData.eventid), classes: ['analytics-btn', "buttonx"] });
    } else if (isLoggedIn) {
        actions.push({ text: 'Report Event', onClick: () => reportPost(eventData.eventid, 'event') });
    }

    eventInfo.append(
        topRow,
        ...(countdown ? [countdown] : []),
        ...(eventData.tags?.length ? [createTags(eventData.tags)] : []),
        ...(eventData.social_links ? [createSocialLinks(eventData.social_links)] : []),
        ...(eventData.custom_fields ? [createCustomFields(eventData.custom_fields)] : []),
        ...(eventData.placename && eventData.placeid ? [createPlaceLink(eventData.placename, eventData.placeid)] : []),
        createElement("div", { class: "event-actions" }, actions.map(a => Button(a.text, "", { click: a.onClick }, a.classes?.join(" ")))),
        createEditPlaceholder()
    );

    eventInfo.appendChild(evanacon);
    return eventInfo;
}

function createEditPlaceholder() {
    return createElement("div", { class: "eventedit", id: "editevent" });
}

export async function displayEventDetails(content, eventData, isCreator, isLoggedIn) {
    content.replaceChildren();
    const wrapper = createElement("div", { class: `event-wrapper ${getEventColorClass(eventData.category)}` });
    const card = createElement("div", { class: "eventx-card hvflex" });

    // card.append(createBannerSection(eventData, isCreator));
    card.append(createEventBannerSection(eventData, isCreator));
    card.append(createInfoSection(eventData, isCreator, isLoggedIn));

    wrapper.appendChild(card);
    content.appendChild(wrapper);
    content.appendChild(createElement("div", { id: "edittabs" }, []));
}
