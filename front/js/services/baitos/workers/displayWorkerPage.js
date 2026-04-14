/* Router - Directs to appropriate interface */
import { getState } from "../../../state/state.js";
import { displayWorkerProfile } from "./displayWorkerProfile.js";
import { displayManageWorkerProfile } from "./displayManageWorkerProfile.js";
import { displayCreateOrEditBaitoProfile } from "../create/createBaitoProfile.js";

/**
 * Main entry point - routes to correct interface based on user role
 */
export async function displayWorkerPage(contentContainer, isLoggedIn, workerId) {
  const currentUser = getState("user");
  
  // Fetch worker to check ownership
  let worker = null;
  try {
    const { apiFetch } = await import("../../../api/api.js");
    worker = await apiFetch(`/baitos/worker/${workerId}`);
  } catch (_e) {
    const { createElement } = await import("../../../components/createElement.js");
    contentContainer.replaceChildren(
      createElement("p", { class: "error-msg" }, ["⚠️ Failed to load worker profile."])
    );
    return;
  }

  // Route based on ownership
  if (worker.userId === currentUser) {
    // Worker viewing their own profile - show management interface
    displayManageWorkerProfile(contentContainer, isLoggedIn, workerId);
  } else {
    // Other user viewing this worker - show hirer interface
    displayWorkerProfile(contentContainer, isLoggedIn, workerId);
  }
}

export function displayCreateBaitoProfile(isLoggedIn, contentContainer) {
  return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "create");
}

export function displayEditBaitoProfile(isLoggedIn, contentContainer, workerId) {
  return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "edit", workerId);
}