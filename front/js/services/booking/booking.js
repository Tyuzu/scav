import { createElement } from "../../components/createElement";
import { createFormGroup } from "../../components/createFormGroup.js";
import Notify from "../../components/ui/Notify.mjs";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import { genId, bookingStorage, bookingApi } from "./bookingApi.js";

// ---------- Helpers ----------
function makeButton(label, { class: cls, onclick, disabled = false }) {
    return createElement("button", { class: cls, onclick, disabled }, [label]);
}

function confirmAction(message, action) {
    if (confirm(message)) return action();
}

function notifyError(reason, map = {}) {
    const msg = map?.[reason] || "Operation failed";
    Notify(msg, { type: "error", duration: 3000 });
}

function notifySuccess(msg, duration = 2000) {
    Notify(msg, { type: "success", duration });
}

function withRefresh(action, refreshers = []) {
    return async (...args) => {
        const ok = await action(...args);
        if (ok) {
            for (const fn of refreshers) await fn();
        }
    };
}

// ---------- Bookings list ----------
function createBookingsList(api, userId, isAdmin) {
    const bookingsList = createElement("div", { class: "bookings-list" }, []);
    let showCancelled = false;

    async function renderBookings() {
        bookingsList.replaceChildren();
        const bookings = await api.apiListBookings();
        if (!bookings.length) {
            bookingsList.appendChild(createElement("div", {}, ["No bookings yet."]));
            return;
        }

        bookings.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
        const userIds = [...new Set(bookings.map(b => b.userId))].filter(id => id && id !== "guest");
        const userMeta = await fetchUserMeta(userIds);
        const totalSeats = bookings.reduce((s, b) => s + (b.seats || 1), 0);

        const header = createElement("div", { class: "booking-header" }, [
            `Total Bookings: ${bookings.length} — Slots: ${totalSeats}`
        ]);
        const toggle = makeButton(showCancelled ? "Hide Cancelled" : "View Cancelled Bookings", {
            class: "btn btn-small",
            onclick: () => { showCancelled = !showCancelled; renderBookings(); }
        });
        header.appendChild(toggle);
        bookingsList.appendChild(header);

        bookings.forEach((b, idx) => {
            if (!showCancelled && b.status === "cancelled") return;

            const isCurrentUser = b.userId === userId;
            const username = b.userId === "guest" ? "Guest" : (userMeta[b.userId]?.username || b.userId);
            const timeRange = b.end && b.end !== b.start ? `${b.start} - ${b.end}` : b.start;
            const seatsNote = (b.seats && b.seats > 1) ? ` (${b.seats} seats)` : "";
            const statusNote = b.status === "cancelled" ? " [CANCELLED]" : "";
            const tierNote = b.tierName ? ` — Tier: ${b.tierName}` : "";
            const label = `${idx + 1}. ${username} — ${b.date} @ ${timeRange}${seatsNote}${statusNote}${tierNote}`;

            const item = createElement("div", {
                class: `booking-item${isCurrentUser ? " booking-item-current" : ""}${b.status === "cancelled" ? " booking-item-cancelled" : ""}`
            }, [label]);

            if (isCurrentUser && !isAdmin && b.status !== "cancelled") {
                const cancelBtn = makeButton("Cancel", {
                    class: "btn btn-small btn-danger",
                    onclick: () => confirmAction(
                        `Cancel your booking on ${b.date} at ${timeRange}?`,
                        withRefresh(
                            async () => {
                                const res = await api.apiCancelBooking(b.id);
                                if (res) { notifySuccess("Booking cancelled"); return true; }
                                notifyError(); return false;
                            },
                            [renderBookings]
                        )
                    )
                });
                item.appendChild(createElement("div", { class: "slot-actions" }, [cancelBtn]));
            }

            bookingsList.appendChild(item);
        });
    }

    return { bookingsList, renderBookings };
}

// ---------- Tier Management (Admin) ----------
function renderTierManager(api, container, refreshSlots, entityType, entityId) {
    const tierList = createElement("div", { class: "tier-list" });

    async function refreshTiers() {
        tierList.replaceChildren();
        const tiers = await api.apiListTiers();
        if (!tiers.length) {
            tierList.appendChild(createElement("div", {}, ["No tiers defined yet."]));
            return;
        }

        tiers.forEach(tier => {
            const item = createElement("div", { class: "tier-item" }, [
                `${tier.name} — $${tier.price}/seat — cap ${tier.capacity}`
            ]);
            const delBtn = makeButton("Delete", {
                class: "btn btn-small btn-danger",
                onclick: () => confirmAction(
                    "Delete this tier and all associated slots?",
                    withRefresh(
                        async () => {
                            await api.apiDeleteTier(tier.id);
                            notifySuccess("Tier deleted");
                            return true;
                        },
                        [refreshTiers, refreshSlots]
                    )
                )
            });
            item.appendChild(delBtn);
            tierList.appendChild(item);
        });
    }

    const nameInput = createFormGroup({ label: "Tier Name", id: "tier-name", type: "text", placeholder: "Tier name" });
    const priceInput = createFormGroup({ label: "Price", id: "tier-price", type: "number", value: 10, placeholder: "Price" });
    const capInput = createFormGroup({ label: "Capacity", id: "tier-capacity", type: "number", value: 20, placeholder: "Capacity" });

    const addBtn = makeButton("Add Tier", {
        class: "btn btn-primary",
        onclick: withRefresh(async () => {
            const tier = {
                id: genId(),
                entityType,
                entityId,
                name: nameInput.querySelector("input").value || "Untitled",
                price: Math.max(0, parseFloat(priceInput.querySelector("input").value || "0")),
                capacity: Math.max(1, parseInt(capInput.querySelector("input").value || "1", 10)),
                timeRange: ["09:00", "17:00"],  // default
                daysOfWeek: [1,2,3,4,5],        // default weekdays
                features: [],
                createdAt: Date.now()
            };
            await api.apiCreateTier(tier);
            notifySuccess("Tier added");
            nameInput.querySelector("input").value = "";
            return true;
        }, [refreshTiers])
    });

    container.appendChild(createElement("h3", {}, ["Pricing Tiers"]));
    container.appendChild(nameInput);
    container.appendChild(priceInput);
    container.appendChild(capInput);
    container.appendChild(addBtn);
    container.appendChild(tierList);
    refreshTiers();
}


// ---------- Admin UI ----------
function renderAdminUi(api, storage, modalContent, refreshBookings, entityType, entityId) {
    const adminSlotsContainer = createElement("div", { class: "admin-slots-container" }, []);
    modalContent.appendChild(adminSlotsContainer);

    const renderAdminSlots = async () => {
        adminSlotsContainer.replaceChildren();
        const [slots, bookings] = await Promise.all([api.apiListSlots(), api.apiListBookings()]);

        if (!slots.length) {
            adminSlotsContainer.appendChild(createElement("div", {}, ["No slots defined yet."]));
            return;
        }

        slots.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
        slots.forEach(slot => {
            const bookedSeats = bookings
                .filter(b => b.slotId === slot.id)
                .reduce((s, bb) => s + (bb.seats || 1), 0);

            const label = `${slot.date} • ${slot.start}${slot.end ? ` - ${slot.end}` : ""} — ${bookedSeats}/${slot.capacity} [${slot.tierName || "no tier"}]`;

            const item = createElement("div", { class: "slot-row" }, [
                createElement("div", { class: "slot-label" }, [label])
            ]);

            const delBtn = makeButton("Delete", {
                class: "btn btn-small btn-danger",
                onclick: () => confirmAction(
                    "Delete this slot and associated bookings?",
                    withRefresh(
                        async () => {
                            const ok = await api.apiDeleteSlot(slot.id);
                            if (ok) { notifySuccess("Slot deleted", 1600); return true; }
                            notifyError(); return false;
                        },
                        [renderAdminSlots, refreshBookings]
                    )
                )
            });

            item.appendChild(createElement("div", { class: "slot-actions" }, [delBtn]));
            adminSlotsContainer.appendChild(item);
        });
    };

    // Slot generation from tiers
    const tierGenPanel = createElement("div", { class: "slot-gen-panel" }, []);
    const tierSelect = createFormGroup({
        type: "select", id: "tier-select", label: "Select Tier", placeholder: "Choose a tier"
    });
    const dateRangeStart = createFormGroup({ type: "date", id: "date-start", label: "Start Date" });
    const dateRangeEnd = createFormGroup({ type: "date", id: "date-end", label: "End Date" });

    const genBtn = makeButton("Generate Slots", {
        class: "btn btn-primary",
        onclick: withRefresh(async () => {
            const tierId = tierSelect.querySelector("select").value;
            const start = dateRangeStart.querySelector("input").value;
            const end = dateRangeEnd.querySelector("input").value;
            if (!tierId || !start || !end) {
                notifyError("missing", { missing: "Select tier and date range" });
                return false;
            }
            // ✅ Correct: pass separate args
            await api.apiGenerateSlotsFromTier(tierId, start, end);
            notifySuccess("Slots generated");
            return true;
        }, [renderAdminSlots])
    });

    tierGenPanel.appendChild(tierSelect);
    tierGenPanel.appendChild(dateRangeStart);
    tierGenPanel.appendChild(dateRangeEnd);
    tierGenPanel.appendChild(genBtn);

    modalContent.appendChild(tierGenPanel);
    renderTierManager(api, modalContent, renderAdminSlots, entityType, entityId);
    renderAdminSlots();

    // refresh tier dropdown
    api.apiListTiers().then(tiers => {
        const select = tierSelect.querySelector("select");
        tiers.forEach(t => {
            const opt = createElement("option", { value: t.id }, [t.name]);
            select.appendChild(opt);
        });
    });
}

// ---------- User UI ----------
function renderUserUi(api, storage, modalContent, userId, refreshBookings, entityType, entityId, modalOverlay) {
    const slotsContainer = createElement("div", { "data-slots-container": "true", class: "slots-container" }, []);
    modalContent.appendChild(slotsContainer);

    async function refreshSlots() {
        slotsContainer.replaceChildren();
        const [slots, bookings, tiers] = await Promise.all([
            api.apiListSlots(), api.apiListBookings(), api.apiListTiers()
        ]);
        if (!slots.length) {
            slotsContainer.appendChild(createElement("div", {}, ["No predefined slots."]));
            return;
        }

        slots.sort((a, b) => new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`));
        for (const slot of slots) {
            const tier = tiers.find(t => t.id === slot.tierId);
            const bookedSeats = bookings.filter(b => b.slotId === slot.id).reduce((s, bb) => s + (bb.seats || 1), 0);
            const rem = Math.max(0, (slot.capacity || 0) - bookedSeats);

            const slotRow = createElement("div", { class: "slot-row" }, []);
            slotRow.appendChild(createElement("div", { class: "slot-label" }, [
                `${slot.date} • ${slot.start}${slot.end ? ` - ${slot.end}` : ""} — ${bookedSeats}/${slot.capacity} taken — ${tier?.name || "No tier"} ($${tier?.price || 0})`
            ]));

            const actions = createElement("div", { class: "slot-actions" }, []);
            const seatsInput = createFormGroup({
                type: "number",
                id: `seats-${slot.id}`,
                label: "Seats",
                value: 1,
                additionalProps: { min: 1, max: rem > 0 ? rem : 1, class: "small-input input" }
            });

            const btn = makeButton(rem <= 0 ? "Full" : `Book (${rem} left)`, {
                class: `btn btn-small ${rem <= 0 ? "btn-secondary" : "btn-primary"}`,
                disabled: rem <= 0,
                onclick: withRefresh(async () => {
                    if (rem <= 0) return false;
                    const seatsToBook = Math.max(
                        1,
                        Math.min(parseInt(seatsInput.querySelector("input").value || "1", 10), rem)
                    );
                    const payload = {
                        userId, entityType, entityId,
                        slotId: slot.id, date: slot.date, start: slot.start, end: slot.end || null,
                        seats: seatsToBook, tierId: slot.tierId
                    };
                    const res = await api.apiCreateBooking(payload);
                    if (!res.ok) {
                        notifyError(res.reason, {
                            "slot-missing": "Slot no longer available.",
                            "slot-full": "Slot is full.",
                            "already-slot": "You already booked this slot."
                        });
                        return false;
                    }
                    notifySuccess("Booking confirmed!");
                    return true;
                }, [refreshBookings, refreshSlots])
            });

            actions.appendChild(seatsInput);
            actions.appendChild(btn);
            slotRow.appendChild(actions);
            slotsContainer.appendChild(slotRow);
        }
    }

    refreshSlots();
}

// ---------- Modal ----------
function openBookingModal(api, storage, entityType, entityId, entityCategory, userId, isAdmin, refreshBookings) {
    if (document.getElementById("booking-modal")) return;
    const modalOverlay = createElement("div", { id: "booking-modal", class: "booking-overlay" }, []);
    const modal = createElement("div", { class: "booking-modal" }, []);
    const header = createElement("div", { class: "booking-modal-header" }, [
        createElement("h2", {}, [isAdmin ? `Manage Slots & Tiers for ${entityCategory}` : `Book Slot for ${entityCategory}`])
    ]);
    const body = createElement("div", { class: "booking-modal-body" }, []);
    const footer = createElement("div", { class: "booking-modal-footer" }, []);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    modalOverlay.appendChild(modal);

    if (isAdmin) {
        renderAdminUi(api, storage, body, refreshBookings, entityType, entityId);
    } else {
        renderUserUi(api, storage, body, userId, refreshBookings, entityType, entityId, modalOverlay);
    }

    const closeBtn = makeButton("Close", {
        class: "btn btn-secondary",
        onclick: () => { if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay); }
    });
    footer.appendChild(closeBtn);

    document.body.appendChild(modalOverlay);
}

// ---------- Main Entry ----------
export function displayBooking(
    { entityType, entityId, entityCategory, userId = "guest", isAdmin = false },
    bookingContainer
) {
    const storage = bookingStorage(entityType, entityId);
    const api = bookingApi(entityType, entityId, storage, userId);

    const { bookingsList, renderBookings } = createBookingsList(api, userId, isAdmin);

    bookingContainer.replaceChildren();
    bookingContainer.appendChild(bookingsList);
    renderBookings();

    const actionBtn = makeButton(isAdmin ? "Manage Slots & Tiers" : "Book Now", {
        class: "btn btn-primary",
        onclick: () => openBookingModal(api, storage, entityType, entityId, entityCategory, userId, isAdmin, renderBookings)
    });
    bookingContainer.appendChild(actionBtn);

    return { refresh: renderBookings };
}
