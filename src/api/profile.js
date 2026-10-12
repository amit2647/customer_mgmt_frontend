import request from "./client";

/*
 * The signed-in person's own record. Separate from api/users, which manages
 * other people and needs users.* permissions; these need only a session.
 */

export function getProfile() {
  return request("/profile");
}

// Changing email also needs currentPassword; the server refuses without it.
export function updateProfile({ name, email, currentPassword }) {
  return request("/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, email, currentPassword }),
  });
}

export function changePassword({ currentPassword, newPassword }) {
  return request("/profile/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/*
 * Two-factor sign-in (auth-hardening P5). Setting up returns a secret to
 * scan; it is switched on by the first code from it, which returns the
 * recovery codes, shown once. Switching off and new recovery codes need a
 * current code.
 */
export function getTwoFactor() {
  return request("/profile/mfa");
}

export function startTwoFactorSetup() {
  return request("/profile/mfa/setup", { method: "POST" });
}

export function enableTwoFactor(code) {
  return request("/profile/mfa/enable", { method: "POST", body: JSON.stringify({ code }) });
}

export function disableTwoFactor(code) {
  return request("/profile/mfa/disable", { method: "POST", body: JSON.stringify({ code }) });
}

export function newRecoveryCodes(code) {
  return request("/profile/mfa/recovery-codes", { method: "POST", body: JSON.stringify({ code }) });
}
