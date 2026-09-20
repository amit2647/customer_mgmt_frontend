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
