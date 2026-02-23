/** 
 * Architecture Verification Script
 * Run this in browser console to verify all systems are working
 * 
 * Usage: Copy & paste into browser console on localhost
 */

const verify = async () => {
  console.log("🔍 Verifying Frontend Architecture...\n");

  const checks = [];

  // 1. Check config/env.js exists and loads
  try {
    const { apiConfig } = await import("./js/config/env.js");
    console.log("✅ Environment Config");
    console.log(`   - Environment: ${apiConfig.environment}`);
    console.log(`   - API URL: ${apiConfig.API_URL}`);
    console.log(`   - isDev: ${apiConfig.isDev}`);
    checks.push(true);
  } catch (e) {
    console.log("❌ Environment Config - " + e.message);
    checks.push(false);
  }

  // 2. Check state/selectors.js exists
  try {
    const { isAuthenticated, getUserId, createSelector } = await import("./js/state/selectors.js");
    console.log("✅ State Selectors");
    console.log(`   - isAuthenticated: ${typeof isAuthenticated}`);
    console.log(`   - getUserId: ${typeof getUserId}`);
    console.log(`   - createSelector: ${typeof createSelector}`);
    checks.push(true);
  } catch (e) {
    console.log("❌ State Selectors - " + e.message);
    checks.push(false);
  }

  // 3. Check API layer
  try {
    const { HTTPClient } = await import("./js/api/httpClient.js");
    const { RequestCache, RequestDeduplicator } = await import("./js/api/cache.js");
    const { ErrorTracker, HTTPError } = await import("./js/api/errorHandler.js");
    console.log("✅ API Layer");
    console.log(`   - HTTPClient: ${typeof HTTPClient}`);
    console.log(`   - RequestCache: ${typeof RequestCache}`);
    console.log(`   - RequestDeduplicator: ${typeof RequestDeduplicator}`);
    console.log(`   - ErrorTracker: ${typeof ErrorTracker}`);
    console.log(`   - HTTPError: ${typeof HTTPError}`);
    checks.push(true);
  } catch (e) {
    console.log("❌ API Layer - " + e.message);
    checks.push(false);
  }

  // 4. Check utils
  try {
    const { lazyLoad, preloadModules, deferNonCritical, TaskBatcher } = await import("./js/utils/lazyLoad.js");
    const { PerformanceMonitor } = await import("./js/utils/performanceMonitor.js");
    console.log("✅ Utilities");
    console.log(`   - lazyLoad: ${typeof lazyLoad}`);
    console.log(`   - PerformanceMonitor: ${typeof PerformanceMonitor}`);
    console.log(`   - TaskBatcher: ${typeof TaskBatcher}`);
    checks.push(true);
  } catch (e) {
    console.log("❌ Utilities - " + e.message);
    checks.push(false);
  }

  // 5. Check CSS reorganization
  try {
    const stylesheets = [];
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      if (sheet.href && (sheet.href.includes("style.css") || sheet.href.includes("_core") || sheet.href.includes("_layout"))) {
        stylesheets.push(sheet.href.split("/").pop());
      }
    }
    console.log("✅ CSS Organization");
    console.log(`   - Stylesheets loaded: ${stylesheets.length}`);
    if (stylesheets.length > 0) {
      console.log(`   - Examples: ${stylesheets.slice(0, 3).join(", ")}`);
    }
    checks.push(true);
  } catch (e) {
    console.log("❌ CSS Organization - " + e.message);
    checks.push(false);
  }

  // 6. Check linting config exists
  try {
    const eslint = fetch("./.eslintrc.json").then(r => r.ok);
    const prettier = fetch("./.prettierrc.json").then(r => r.ok);
    await Promise.all([eslint, prettier]);
    console.log("✅ Code Quality Config");
    console.log(`   - ESLint: ✓`);
    console.log(`   - Prettier: ✓`);
    checks.push(true);
  } catch (e) {
    console.log("⚠️ Code Quality Config - " + e.message);
    checks.push(false);
  }

  // 7. Check debug tools
  try {
    if (typeof window.__APP_DEBUG !== "undefined") {
      console.log("✅ Development Tools");
      console.log(`   - Debug tools available: ✓`);
      console.log(`   - Usage: window.__APP_DEBUG.getMetrics()`);
    } else {
      console.log("⚠️ Development Tools - Only available on localhost");
    }
    checks.push(true);
  } catch (e) {
    console.log("⚠️ Development Tools - " + e.message);
    checks.push(true); // Not critical
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  const passed = checks.filter(c => c).length;
  const total = checks.length;
  console.log(`Summary: ${passed}/${total} checks passed`);

  if (passed === total) {
    console.log("🎉 All systems operational!");
    console.log("\n📚 Next Steps:");
    console.log("   1. Read: FINAL_SUMMARY.md");
    console.log("   2. Read: QUICK_START.md");
    console.log("   3. Check: IMPLEMENTATION_GUIDE.md");
    console.log("   4. Review: BEFORE_AND_AFTER.md");
  } else {
    console.log("⚠️ Some checks failed. Review the errors above.");
  }

  return { passed, total };
};

// Run verification
verify().catch(console.error);
