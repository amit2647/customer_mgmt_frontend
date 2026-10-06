import request from "./client";

/*
 * bundle-service (/api/bundles): the profession bundles this deployment
 * offers, and the organization's installed one.
 */

// What is installed, for every signed-in member: { bundle: null } until an
// install has finished.
export function getInstalledBundle() {
  return request("/bundles/installed");
}

// Settings → Bundle (bundles.manage): offered bundles plus install status.
export function getBundles() {
  return request("/bundles");
}

// Installs, or resumes an install that stopped part-way.
export function installBundle(key) {
  return request(`/bundles/${encodeURIComponent(key)}/install`, { method: "POST" });
}

// Runs every step again at the offered version; anything the firm edited is
// kept. Resumes an upgrade that stopped part-way.
export function upgradeBundle(key) {
  return request(`/bundles/${encodeURIComponent(key)}/upgrade`, { method: "POST" });
}

// Items the firm edited that the installed version ships differently, each
// with the firm's content beside the bundle's.
export function getCustomizedItems() {
  return request("/bundles/installed/customized");
}

// choice: "accept" takes the bundle's version; "dismiss" keeps the firm's.
export function chooseCustomizedItem({ step, kind, key }, choice) {
  return request("/bundles/installed/customized", { method: "POST", body: JSON.stringify({ step, kind, key, choice }) });
}
