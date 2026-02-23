import { apiFetch } from "../../api/api.js";

// ---------- Small helpers ----------
export function genId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- API wrappers ----------
export function bookingApi(entityType, entityId, storage, userId) {
    // ----- Slots -----
    async function apiListSlots() {
        try {
            const res = await apiFetch(
                `/bookings/slots?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.slots || [];
        } catch (err) {
            console.warn("Slots API failed, falling back to local", err);
            return storage.localGetSlots();
        }
    }

    async function apiCreateSlot(slot) {
        try {
            const res = await apiFetch(`/bookings/slots`, "POST", slot);
            return res.slot;
        } catch {
            storage.localSaveSlot(slot);
            return slot;
        }
    }

    async function apiDeleteSlot(slotId) {
        try {
            await apiFetch(`/bookings/slots/${slotId}`, "DELETE");
            return true;
        } catch {
            return storage.localDeleteSlot(slotId);
        }
    }

    // ----- Tiers -----
    async function apiListTiers() {
        try {
            const res = await apiFetch(
                `/bookings/tiers?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.tiers || [];
        } catch (err) {
            console.warn("Tiers API failed, falling back to local", err);
            return storage.localGetTiers();
        }
    }

    async function apiCreateTier(tier) {
        try {
            const res = await apiFetch(`/bookings/tiers`, "POST", tier);
            return res.tier;
        } catch {
            storage.localSaveTier(tier);
            return tier;
        }
    }

    async function apiDeleteTier(tierId) {
        try {
            await apiFetch(`/bookings/tiers/${tierId}`, "DELETE");
            return true;
        } catch {
            return storage.localDeleteTier(tierId);
        }
    }

// ----- Auto-generate slots from tier -----
async function apiGenerateSlotsFromTier(tierId, startDate, endDate) {
    try {
        const res = await apiFetch(
            `/bookings/tiers/${tierId}/generate-slots`,
            "POST",
            { startDate, endDate }   // ✅ correct keys for backend
        );
        return res.slots || [];
    } catch (err) {
        const tier = storage.localGetTiers().find(t => t.id === tierId);
        if (!tier) return [];
        return storage.localGenerateSlotsFromTier(tier, { startDate, endDate }); // ✅ same keys for local
    }
}


    // // ----- Auto-generate slots from tier -----
    // async function apiGenerateSlotsFromTier(tierId, start, end) {
    //     try {
    //         const res = await apiFetch(`/bookings/tiers/${tierId}/generate-slots`, "POST", { start, end });
    //         return res.slots || [];
    //     } catch (err) {
    //         const tier = storage.localGetTiers().find(t => t.id === tierId);
    //         if (!tier) return [];
    //         return storage.localGenerateSlotsFromTier(tier, { start, end });
    //     }
    // }

    // ----- Bookings -----
    async function apiListBookings() {
        try {
            const res = await apiFetch(
                `/bookings/bookings?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
            );
            return res.bookings || [];
        } catch (err) {
            console.warn("Bookings API failed, falling back to local", err);
            return storage.localGetBookings();
        }
    }

    async function apiCreateBooking(payload) {
        try {
            return await apiFetch(`/bookings/bookings`, "POST", payload);
        } catch {
            // ---- Local fallback enforcement ----
            const all = JSON.parse(localStorage.getItem(storage.BOOKING_KEY) || "{}");
            if (!all[entityType]) all[entityType] = {};
            if (!all[entityType][entityId]) all[entityType][entityId] = [];

            const seatsToBook = Math.max(1, parseInt(payload.seats || 1, 10));

            // Slot-based booking rules
            if (payload.slotId) {
                const slots = storage.localGetSlots();
                const slot = slots.find(s => s.id === payload.slotId);
                if (!slot) return { ok: false, reason: "slot-missing" };

                const bookedSeats = all[entityType][entityId]
                    .filter(b => b.slotId === slot.id)
                    .reduce((sum, b) => sum + (b.seats || 1), 0);

                if (bookedSeats + seatsToBook > (slot.capacity || 0)) return { ok: false, reason: "slot-full" };

                const userAlready = all[entityType][entityId].some(
                    b => b.userId === payload.userId && b.slotId === slot.id
                );
                if (userAlready) return { ok: false, reason: "already-slot" };
            } else {
                // Date capacity fallback
                const dateCap = storage.localGetDateCap(payload.date);
                if (dateCap !== null) {
                    const totalForDate = all[entityType][entityId]
                        .filter(b => b.date === payload.date)
                        .reduce((sum, b) => sum + (b.seats || 1), 0);

                    if (totalForDate + seatsToBook > dateCap) return { ok: false, reason: "date-full" };
                }
            }

            const stored = {
                id: genId(),
                slotId: payload.slotId || null,
                tierId: payload.tierId || null,
                userId: payload.userId,
                date: payload.date,
                start: payload.start,
                end: payload.end || payload.start,
                seats: seatsToBook,
                pricePaid: payload.pricePaid || null,
                status: "active",
                createdAt: new Date().toISOString()
            };

            storage.localSaveBooking(stored);
            return { ok: true, booking: stored };
        }
    }

    async function apiCancelBooking(bookingId) {
        try {
            await apiFetch(`/bookings/bookings/${bookingId}`, "DELETE");
            return true;
        } catch {
            return storage.localCancelBooking(bookingId, userId);
        }
    }

    // ----- Date capacity -----
    async function apiGetDateCapacity(date) {
        try {
            const res = await apiFetch(
                `/bookings/date-capacity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&date=${encodeURIComponent(date)}`
            );
            return res.capacity === null ? null : res.capacity;
        } catch {
            return storage.localGetDateCap(date);
        }
    }

    async function apiSetDateCapacity(date, capacity) {
        try {
            await apiFetch(`/bookings/date-capacity`, "POST", { entityType, entityId, date, capacity });
            return true;
        } catch {
            storage.localSetDateCap(date, capacity);
            return true;
        }
    }

    return {
        apiListSlots, apiCreateSlot, apiDeleteSlot,
        apiListTiers, apiCreateTier, apiDeleteTier, apiGenerateSlotsFromTier,
        apiListBookings, apiCreateBooking, apiCancelBooking,
        apiGetDateCapacity, apiSetDateCapacity
    };
}

// ---------- LocalStorage helpers ----------
export function bookingStorage(entityType, entityId) {
    const SLOT_KEY = "entity_slots";
    const TIER_KEY = "entity_tiers";
    const BOOKING_KEY = "entity_bookings";
    const DATE_CAP_KEY = "entity_date_caps";

    const readJson = key => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
    const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    // ----- Slots -----
    function localSaveSlot(slot) {
        const all = readJson(SLOT_KEY);
        if (!all[entityType]) all[entityType] = {};
        if (!all[entityType][entityId]) all[entityType][entityId] = [];
        all[entityType][entityId].push(slot);
        writeJson(SLOT_KEY, all);
    }

    function localGetSlots() {
        const all = readJson(SLOT_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localDeleteSlot(slotId) {
        const all = readJson(SLOT_KEY);
        if (!all[entityType]?.[entityId]) return false;
        all[entityType][entityId] = all[entityType][entityId].filter(s => s.id !== slotId);
        writeJson(SLOT_KEY, all);

        // Cascade delete bookings for slot
        const bookings = readJson(BOOKING_KEY);
        if (bookings[entityType]?.[entityId]) {
            bookings[entityType][entityId] = bookings[entityType][entityId].filter(b => b.slotId !== slotId);
            writeJson(BOOKING_KEY, bookings);
        }
        return true;
    }

    // ----- Tiers -----
    function localSaveTier(tier) {
        const all = readJson(TIER_KEY);
        if (!all[entityType]) all[entityType] = {};
        if (!all[entityType][entityId]) all[entityType][entityId] = [];
        all[entityType][entityId].push(tier);
        writeJson(TIER_KEY, all);
    }

    function localGetTiers() {
        const all = readJson(TIER_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localDeleteTier(tierId) {
        const all = readJson(TIER_KEY);
        if (!all[entityType]?.[entityId]) return false;
        all[entityType][entityId] = all[entityType][entityId].filter(t => t.id !== tierId);
        writeJson(TIER_KEY, all);
        return true;
    }

    function localGenerateSlotsFromTier(tier, { startDate, endDate }) {   // ✅ keys aligned
        const slots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
    
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(d.getDay())) continue;
    
            const dateStr = d.toISOString().split("T")[0];
            const [startH, startM] = (tier.timeRange?.[0] || "09:00").split(":").map(Number);
            const [endH, endM] = (tier.timeRange?.[1] || "17:00").split(":").map(Number);
    
            const slot = {
                id: genId(),
                tierId: tier.id,
                entityType, entityId,
                date: dateStr,
                start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
                end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
                capacity: tier.capacity
            };
            localSaveSlot(slot);
            slots.push(slot);
        }
        return slots;
    }
    

    // ----- Bookings -----
    function localSaveBooking(b) {
        const all = readJson(BOOKING_KEY);
        if (!all[entityType]) all[entityType] = {};
        if (!all[entityType][entityId]) all[entityType][entityId] = [];
        all[entityType][entityId].push(b);
        writeJson(BOOKING_KEY, all);
    }

    function localGetBookings() {
        const all = readJson(BOOKING_KEY);
        return all[entityType]?.[entityId] || [];
    }

    function localCancelBooking(bookingId, userIdArg) {
        const all = readJson(BOOKING_KEY);
        if (!all[entityType]?.[entityId]) return false;

        const before = all[entityType][entityId].length;
        all[entityType][entityId] = all[entityType][entityId].map(b =>
            b.id === bookingId && b.userId === userIdArg ? { ...b, status: "cancelled" } : b
        );
        writeJson(BOOKING_KEY, all);
        return all[entityType][entityId].length === before;
    }

    // ----- Date caps -----
    function localGetDateCap(date) {
        const all = readJson(DATE_CAP_KEY);
        return all[entityType]?.[entityId]?.[date] ?? null;
    }

    function localSetDateCap(date, cap) {
        const all = readJson(DATE_CAP_KEY);
        if (!all[entityType]) all[entityType] = {};
        if (!all[entityType][entityId]) all[entityType][entityId] = {};
        all[entityType][entityId][date] = cap;
        writeJson(DATE_CAP_KEY, all);
    }

    return {
        localSaveSlot, localGetSlots, localDeleteSlot,
        localSaveTier, localGetTiers, localDeleteTier, localGenerateSlotsFromTier,
        localSaveBooking, localGetBookings, localCancelBooking,
        localGetDateCap, localSetDateCap,
        BOOKING_KEY
    };
}
