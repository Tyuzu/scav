import { createElement } from "../../components/createElement.js";

export function displayEventNews(c, eventId, isLoggedIn) {
    // c.replacechildren()
    c.appendChild(createElement("p",{},[`${eventId} News`]));
}
export function displayEventPolls(c, eventId, isLoggedIn) {
    // c.replacechildren()
    c.appendChild(createElement("p",{},[`${eventId} Polls`]));
}