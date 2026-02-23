
export const legalRoutes = {

    "/about": { moduleImport: () => import("../legalPages/home.js"), functionName: "About" },

    "/contact": { moduleImport: () => import("../legalPages/home.js"), functionName: "Contact" },

    "/faq": { moduleImport: () => import("../legalPages/home.js"), functionName: "Faq" },

    "/terms": { moduleImport: () => import("../legalPages/home.js"), functionName: "Terms" },

    "/privacy": { moduleImport: () => import("../legalPages/home.js"), functionName: "Privacy" },

    "/refund": { moduleImport: () => import("../legalPages/home.js"), functionName: "Refund" },

    "/shipping": { moduleImport: () => import("../legalPages/home.js"), functionName: "Shipping" },

    "/returns": { moduleImport: () => import("../legalPages/home.js"), functionName: "Returns" },

    "/disclaimer": { moduleImport: () => import("../legalPages/home.js"), functionName: "Disclaimer" },

    "/blog": { moduleImport: () => import("../legalPages/home.js"), functionName: "Blog" },
}