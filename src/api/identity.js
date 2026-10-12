import request from "./client";

/*
 * identity-service administration. Reached through the Kong routes added for
 * /api/users, /api/roles, /api/permissions and /api/organizations; only
 * /api/auth was proxied before.
 *
 * There is no list-users endpoint — users are listed per organization, which is
 * also the correct scoping for this screen.
 */
export function getOrganizationUsers(organizationId) {
  return request(`/organizations/${organizationId}/users`);
}

export function getUser(id) {
  return request(`/users/${id}`);
}

export function createUser(data) {
  return request("/users", { method: "POST", body: JSON.stringify(data) });
}

export function updateUser(id, data) {
  return request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

// A new verification link for a member who has not confirmed yet (P4).
export function resendUserVerification(id) {
  return request(`/users/${id}/verification`, { method: "POST" });
}

// Two-factor (P5): an admin's reset for someone who lost their phone.
export function resetUserTwoFactor(id) {
  return request(`/users/${id}/mfa/reset`, { method: "POST" });
}

// A member's sign-in and security history (P6, system.settings).
export function getUserActivity(id) {
  return request(`/users/${id}/activity`);
}

// The organization's "require two-factor sign-in" policy (system.settings).
export function getSecurityPolicy() {
  return request("/organizations/current/security");
}

export function setSecurityPolicy(requireMfa) {
  return request("/organizations/current/security", { method: "PUT", body: JSON.stringify({ requireMfa }) });
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: "DELETE" });
}

export function getRoles() {
  return request("/roles");
}

export function getRole(id) {
  return request(`/roles/${id}`);
}

export function createRole(data) {
  return request("/roles", { method: "POST", body: JSON.stringify(data) });
}

export function updateRole(id, data) {
  return request(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function updateRolePermissions(id, permissionCodes) {
  return request(`/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  });
}

export function deleteRole(id) {
  return request(`/roles/${id}`, { method: "DELETE" });
}

export function getPermissions() {
  return request("/permissions");
}

export function getOrganization(id) {
  return request(`/organizations/${id}`);
}

export function updateOrganization(id, data) {
  return request(`/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getAccessGrants() {
  return request("/access-grants");
}

export function createAccessGrant(data) {
  return request("/access-grants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function revokeAccessGrant(id) {
  return request(`/access-grants/${id}/revoke`, { method: "POST" });
}

/*
 * Exchanges an invite token for a guest session. Unauthenticated — the token in
 * the body is the credential, so this is the one call here that works with no
 * bearer token present.
 */
/*
 * A guest's invite link enters the sign-in flow (auth-hardening P1): the
 * invite is kept for this tab while the browser goes through Hydra, and the
 * login page redeems it with Hydra's login_challenge.
 */
const PENDING_INVITE = "omnicore-pending-invite";

export function rememberPendingInvite(token) {
  try {
    sessionStorage.setItem(PENDING_INVITE, token);
  } catch {
    // Without storage the guest lands on the plain sign-in page instead.
  }
}

export function takePendingInvite() {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE);
    sessionStorage.removeItem(PENDING_INVITE);
    return token;
  } catch {
    return null;
  }
}

// { redirect_to } to follow, with the guest signed in.
export function redeemAccessInvite(token, loginChallenge) {
  return request("/access-grants/redeem", {
    method: "POST",
    body: JSON.stringify({ token, login_challenge: loginChallenge }),
  });
}
