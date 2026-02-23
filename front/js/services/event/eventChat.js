import { createElement } from "../../components/createElement.js";

export function displayEventChat(c, eventId, isLoggedIn) {
    // c.replacechildren()
    c.appendChild(createElement("p",{},[`Discord like Forum group chat for ${eventId}`]));
}