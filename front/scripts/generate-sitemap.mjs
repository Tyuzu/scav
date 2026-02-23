import fs from "fs";
import path from "path";

const BASE_URL = "https://indium.netlify.app";

const routes = [
  "/", "baitos", "baitos/hire", "grocery", "recipes",
  "places", "itinerary", "events", "music", "artists",
  "social", "posts", "farms", "products", "tools"
];

const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `
  <url>
    <loc>${BASE_URL}${route === "/" ? "/" : "/" + route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === "/" ? "1.0" : "0.7"}</priority>
  </url>`).join("")}
</urlset>`;

fs.writeFileSync(path.resolve("sitemap.xml"), sitemap);
console.log("✅ Sitemap generated:", today);
