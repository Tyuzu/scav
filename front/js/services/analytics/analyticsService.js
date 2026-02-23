import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import Notify from "../../components/ui/Notify.mjs";
import Datex from "../../components/base/Datex.js";

// --- MAIN RENDER FUNCTION ---
export async function renderAnalyticsPage({ container, isLoggedIn, entityType = "events", entityId = null }) {
    if (!container) return;

    while (container.firstChild) container.removeChild(container.firstChild);

    if (!isLoggedIn) {
        Notify("Please log in to view analytics.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    try {
        const endpoint = entityId
            ? `/antics/${entityType}/${entityId}`
            : `/antics/${entityType}/all`;

        const data = await apiFetch(endpoint);

        if (!data || !data.metrics) {
            Notify("No analytics data found.", { type: "warning", dismissible: true });
            return;
        }

        container.appendChild(renderAnalytics(data));

    } catch (err) {
        Notify("Failed to load analytics data.", { type: "error", dismissible: true });
        console.error(err);
    }

    // --- RENDER SECTION ---
    function renderAnalytics(data) {
        const metrics = data.metrics || {};
        const trend = data.trend || [];
        const engagement = data.engagement || {};
        const insights = data.insights || {};
        const topLocations = data.topLocations || [];
        // const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "";
        const lastUpdated = data.lastUpdated ? Datex(data.lastUpdated) : "";

        // Header
        const header = createElement("div", { class: "analytics-header" }, [
            createElement("h2", {}, [`Analytics for ${data.name || "Unknown"}`]),
            createElement("p", {}, [`Entity Type: ${data.type}`]),
            lastUpdated ? createElement("small", {}, [`Last Updated: ${lastUpdated}`]) : null
        ].filter(Boolean));

        // Metrics summary
        const summaryCards = createElement(
            "div",
            { class: "analytics-summary-cards" },
            Object.keys(metrics).map(k =>
                createElement("div", { class: "analytics-card" }, [
                    createElement("h4", {}, [k]),
                    createElement("p", {}, [String(metrics[k])])
                ])
            )
        );

        // Trend section (simple inline visualization)
        const trendSection = createElement("div", { class: "analytics-trend" }, [
            createElement("h3", {}, ["7-Day Trend"]),
            createElement("div", { class: "trend-bars" },
                trend.map(v => createElement("div", { class: "trend-bar", style: `height:${v * 2}px` }, []))
            )
        ]);

        // Engagement details
        const engagementSection = Object.keys(engagement).length
            ? createElement("div", { class: "analytics-engagement" }, [
                createElement("h3", {}, ["Engagement Metrics"]),
                createElement("ul", {}, Object.entries(engagement).map(([k, v]) =>
                    createElement("li", {}, [`${k}: ${v}`])
                ))
            ])
            : null;

        // Insights
        const insightsSection = Object.keys(insights).length
            ? createElement("div", { class: "analytics-insights" }, [
                createElement("h3", {}, ["Insights"]),
                createElement("ul", {}, Object.entries(insights).map(([k, v]) =>
                    createElement("li", {}, [`${k}: ${v}`])
                ))
            ])
            : null;

        // Top Locations (if available)
        const topLocationsSection = topLocations.length
            ? createElement("div", { class: "analytics-top-locations" }, [
                createElement("h3", {}, ["Top Locations"]),
                createElement("ul", {}, topLocations.map(loc => createElement("li", {}, [loc])))
            ])
            : null;

        return createElement("div", { class: "analytics-page" }, [
            header,
            summaryCards,
            trendSection,
            engagementSection,
            insightsSection,
            topLocationsSection
        ].filter(Boolean));
    }
}
