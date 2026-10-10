import request from "./client";

/*
 * First-run setup of a new installation (identity-service /setup). Public:
 * no account exists yet.
 */

// { required: false } once set up; otherwise { required: true, organization }.
export function getSetupStatus() {
  return request("/setup/status");
}

// { code, organization: { name, timeZone, currency }, admin: { name, email, password } }
export function completeSetup(input) {
  return request("/setup", { method: "POST", body: JSON.stringify(input) });
}

/*
 * Setup ends by signing in through Hydra, which leaves the app and comes back,
 * so a stopped bundle install's error waits in this tab's storage for the
 * Profession Bundle page.
 */
const SETUP_BUNDLE_ERROR = "omnicore-setup-bundle-error";

export function rememberSetupBundleError(message) {
  try {
    sessionStorage.setItem(SETUP_BUNDLE_ERROR, message || "");
  } catch {
    // The page still offers to resume; it just does not say why.
  }
}

export function takeSetupBundleError() {
  try {
    const message = sessionStorage.getItem(SETUP_BUNDLE_ERROR);
    sessionStorage.removeItem(SETUP_BUNDLE_ERROR);
    return message;
  } catch {
    return null;
  }
}
