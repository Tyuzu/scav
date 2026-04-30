/**
 * Environment Configuration
 * Supports: development, staging, production
 * Automatically detects environment from hostname or uses NODE_ENV
 */

const ENV = {
  dev: {
    MAIN_URL: "https://192.168.234.236:4000",
    BANNERDROP_URL: "https://192.168.234.236:6925",
  },
  staging: {
    MAIN_URL: "https://gallium.onrender.com",
    BANNERDROP_URL: "https://bannerdrop.onrender.com",
  },
  production: {
    MAIN_URL: "https://gallium.onrender.com",
    BANNERDROP_URL: "https://bannerdrop.onrender.com",
  },
};

/**
 * Detect environment from hostname or import.meta.env
 */
function detectEnvironment() {
  // Vite provides import.meta.env.MODE
  if (import.meta?.env?.MODE) {
    const mode = import.meta.env.MODE;
    if (mode === "production") {
return "production";
}
    if (mode === "staging") {
return "staging";
}
    return "dev";
  }

  // Fallback: detect from hostname
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (host.includes("staging")) {
return "staging";
}
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
return "dev";
}
  return "production";
}

const CURRENT_ENV = detectEnvironment();
const CONFIG = ENV[CURRENT_ENV] || ENV.dev;

/**
 * Build all API URLs from base config
 */
export const apiConfig = {
  MAIN_URL: CONFIG.MAIN_URL,
  BANNERDROP_URL: CONFIG.BANNERDROP_URL,

  API_URL: `${CONFIG.MAIN_URL}/api/v1`,
  STRIPE_URL: `${CONFIG.MAIN_URL}/api/v1/stripe`,
  AD_URL: `${CONFIG.MAIN_URL}/api/sda`,
  SEARCH_URL: `${CONFIG.MAIN_URL}/api/v1`,
  MERE_URL: `${CONFIG.MAIN_URL}/api/v1`,
  MERE_WS: CONFIG.MAIN_URL,
  CHAT_URL: CONFIG.MAIN_URL,
  CHAT_WS: `${CONFIG.MAIN_URL.replace("http", "ws").replace("https", "wss")}/ws/newchat`,
  MUSIC_URL: `${CONFIG.MAIN_URL}/api/v1`,
  LIVE_URL: `${CONFIG.MAIN_URL}/api/v1`,
  EMBED_URL: `${CONFIG.MAIN_URL}/embed`,
  SRC_URL: `${CONFIG.BANNERDROP_URL}/static`,
  FILEDROP_URL: `${CONFIG.BANNERDROP_URL}/api/v1/filedrop`,
  CHATDROP_URL: `${CONFIG.BANNERDROP_URL}/api/v1/filedrop/chat`,

  // Runtime info
  isDev: CURRENT_ENV === "dev",
  isStaging: CURRENT_ENV === "staging",
  isProduction: CURRENT_ENV === "production",
  environment: CURRENT_ENV,
};

export default apiConfig;
