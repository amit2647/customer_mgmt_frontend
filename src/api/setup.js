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
