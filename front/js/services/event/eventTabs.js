import { Button } from "../../components/base/Button.js";
import { Imagex } from "../../components/base/Imagex.js";
import { API_URL, apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { displayReviews } from "../reviews/displayReviews.js";
import { displayEventFAQs } from "./eventFAQHelper.js";
// import { displaySeatingMap } from "./seatingMap.js";
// import { loadMap } from "../gmaps/mapUI.js";
import EventTimeline from "../../components/ui/EventTimeline.mjs";
import { EntityType, PictureType, resolveImagePath } from "../../utils/imagePaths.js";


async function displayEventReviews(reviewsContainer, eventId, isCreator, isLoggedIn) {
    displayReviews(reviewsContainer, isCreator, isLoggedIn, "event", eventId);
}

async function displayEventVenue(venueList, isLoggedIn, eventID, seatingplan) {
    // displaySeatingMap(venueList, place, eventid, isLoggedIn);
    // loadMap(venueList, isLoggedIn, { type: "event", id: eventID });
    let imgx = resolveImagePath(EntityType.EVENT, PictureType.SEATING, seatingplan);
    venueList.appendChild(Imagex({ src: imgx }));
}

async function displayEventFAQ(faqContainer, isCreator, eventId, faqs) {
    displayEventFAQs(isCreator, faqContainer, eventId, faqs);
}

async function displayLostAndFound(lnfContainer, isCreator, eventId) {
    lnfContainer.appendChild(createElement("h2", {}, ["Lost And Found"]));
    lnfContainer.appendChild(createElement("p", {}, ["Did anyone lose or find something?"]));

    // Container for buttons + form
    const actionsContainer = createElement("div", { id: "lostFoundActions" }, []);
    lnfContainer.appendChild(actionsContainer);

    // Form section (initially empty, shows when a button is clicked)
    const formSection = createElement("div", { id: "lostFoundForm" }, []);

    // Helper: show form
    function showForm(type) {
        formSection.innerHTML = "";
        formSection.appendChild(createElement("h3", {}, [`Report ${type === "lost" ? "Lost" : "Found"} Item`]));

        const nameInput = createElement("input", { type: "text", placeholder: "Item name" });
        const descInput = createElement("textarea", { placeholder: "Description" });

        const submitBtn = Button("Submit", "", {
            click: async () => {
                const name = nameInput.value.trim();
                const description = descInput.value.trim();
                if (!name) return alert("Name is required");

                const newItem = { type, name, description };
                try {
                    await apiFetch(`/events/${eventId}/lostfound`, "POST", newItem);
                    lnfContainer.innerHTML = "";
                    await displayLostAndFound(lnfContainer, isCreator, eventId);
                } catch (err) {
                    alert("Failed to add item.");
                }
            }
        }, "buttonx primary");

        formSection.appendChild(nameInput);
        formSection.appendChild(descInput);
        formSection.appendChild(submitBtn);
    }

    // Two buttons (available to everyone)
    const btnLost = Button("I lost something", "btnLost", {
        click: () => showForm("lost")
    }, "buttonx primary");
    const btnFound = Button("I found something", "btnFound", {
        click: () => showForm("found")
    }, "buttonx primary");

    actionsContainer.appendChild(btnLost);
    actionsContainer.appendChild(btnFound);
    actionsContainer.appendChild(formSection);

    // Fetch items (after rendering buttons + form placeholder)
    let items = [];
    try {
        items = await apiFetch(`/events/${eventId}/lostfound`);
    } catch (err) {
        lnfContainer.appendChild(createElement("p", {}, ["Failed to load items."]));
        return;
    }

    // Items list
    const itemsList = createElement("div", { id: "lostFoundItems" }, []);
    if (items.length === 0) {
        itemsList.appendChild(createElement("p", {}, ["No items reported yet."]));
    } else {
        items.forEach(item => {
            const itemEl = createElement("div", { "data-id": item.id }, [
                createElement("p", {}, [`[${item.type.toUpperCase()}] ${item.name}`]),
                createElement("p", {}, [`Description: ${item.description}`]),
                createElement("p", {}, [`Reported by: ${item.reportedBy}`])
            ]);
            itemsList.appendChild(itemEl);
        });
    }
    lnfContainer.appendChild(itemsList);
}



async function displayContactDetails(container, isCreator, contacts) {
    container.appendChild(createElement('h2', "", ["ContactDetails"]));
    container.appendChild(createElement('p', "", ["Does anybody need anything?"]));
}

async function displayEventSchedule(schContainer, isCreator, eventId, faqs) {
    const events = [
        { time: '09:00 AM', description: 'Doors Open & Registration' },
        { time: '10:00 AM', description: 'Opening Ceremony' },
        { time: '10:30 AM', description: 'Guest Speaker: The Future of Tech' },
        { time: '11:15 AM', description: 'Panel Discussion: Innovations & AI' },
        { time: '12:00 PM', description: 'Networking & Lunch Break' },
        { time: '01:30 PM', description: 'Workshops: Choose Your Track' },
        { time: '03:00 PM', description: 'Startup Pitch Competition' },
        { time: '04:30 PM', description: 'Closing Remarks & Awards' },
        { time: '05:00 PM', description: 'After-Party & Networking' }
    ];

    schContainer.appendChild(createElement('h2', "", ["Schedule"]));
    schContainer.appendChild(EventTimeline(events));
}


async function displayLivestream(divcontainer, eventId, isLoggedIn) {
    displayEventLiveStream(divcontainer, eventId, isLoggedIn);
}

async function displayEventLiveStream(divcontainer, eventId, isLoggedIn) {
    if (!isLoggedIn) {
        divcontainer.innerHTML = "<p>Please log in to watch.</p>";
        return;
    }

    divcontainer.appendChild(createElement('h2', "", ["Livestream"]));
    // Fetch available angles
    const response = await fetch(`${API_URL}/livestream/${eventId}`);

    if (response.status === 404) {
        divcontainer.appendChild(createElement("p", "", ["No livestream available."]));
        return;
    }

    const { angles } = await response.json();

    if (!angles.length) {
        divcontainer.innerHTML = "<p>No livestream available.</p>";
        return;
    }

    // Create video element
    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.style.width = "100%";
    divcontainer.appendChild(video);

    // Create angle selection
    const angleSelector = document.createElement("select");
    angles.forEach((angle) => {
        const option = document.createElement("option");
        option.value = angle.url;
        option.textContent = angle.name;
        angleSelector.appendChild(option);
    });

    angleSelector.onchange = () => {
        video.src = angleSelector.value;
        video.play();
    };

    divcontainer.appendChild(angleSelector);

    // Start with the first angle
    video.src = angles[0].url;
    video.play();
}



export { displayEventVenue, displayEventFAQ, displayEventReviews, displayLivestream };
export { displayLostAndFound, displayContactDetails, displayEventSchedule };
