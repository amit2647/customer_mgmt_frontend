import request from "./client";

export function getEmailAccounts() {
  return request("/emails/accounts");
}

export function getEmailAccount(id) {
  return request(`/emails/accounts/${id}`);
}

export function createEmailAccount(data) {
  return request("/emails/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEmailAccount(id, data) {
  return request(`/emails/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function activateEmailAccount(id) {
  return request(`/emails/accounts/${id}/activate`, {
    method: "POST",
  });
}

export function deactivateEmailAccount(id) {
  return request(`/emails/accounts/${id}/deactivate`, {
    method: "POST",
  });
}

export function deleteEmailAccount(id) {
  return request(`/emails/accounts/${id}`, {
    method: "DELETE",
  });
}
