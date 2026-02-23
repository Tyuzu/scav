// generate-manifest.mjs
import { writeFileSync } from "fs";

const domain = process.env.VITE_DOMAIN || "https://indium.netlify.app";

const manifest = {
  name: "Farmium",
  short_name: "SPA",
  start_url: "/?source=homescreen",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  theme_color: "#222222",
  background_color: "#ffffff",
  icons: [
    { src: "/assets/icon-72.png", sizes: "72x72", type: "image/png" },
    { src: "/assets/icon-96.png", sizes: "96x96", type: "image/png" },
    { src: "/assets/icon-128.png", sizes: "128x128", type: "image/png" },
    { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  shortcuts: [
    {
      name: "Dashboard",
      short_name: "Dashboard",
      url: "/dashboard",
      icons: [{ src: "/assets/icon-96.png", sizes: "96x96" }],
    },
    {
      name: "Profile",
      short_name: "Profile",
      url: "/profile",
      icons: [{ src: "/assets/icon-96.png", sizes: "96x96" }],
    },
  ],
  related_applications: [
    { platform: "webapp", url: `${domain}/manifest.json` },
    // { platform: "play", id: "com.yourcompany.app" },
  ],
  prefer_related_applications: false,
  url_handlers: [
    { origin: domain },
    { origin: `https://*.${domain.replace("https://", "")}` },
  ],
};

writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));
console.log("✅ manifest.json generated dynamically");
