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
