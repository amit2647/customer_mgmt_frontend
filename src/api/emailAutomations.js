import request from "./client";

export function getEmailAutomations() {
  return request("/emails/automations");
}

export function getEmailAutomation(id) {
  return request(`/emails/automations/${id}`);
}

export function createEmailAutomation(data) {
  return request("/emails/automations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEmailAutomation(id, data) {
  return request(`/emails/automations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function activateEmailAutomation(id) {
  return request(`/emails/automations/${id}/activate`, { method: "POST" });
}

export function deactivateEmailAutomation(id) {
  return request(`/emails/automations/${id}/deactivate`, { method: "POST" });
}

export function deleteEmailAutomation(id) {
  return request(`/emails/automations/${id}`, { method: "DELETE" });
}
