import request from "./client";

export function getEmailTemplates() {
  return request("/emails/templates");
}

export function getEmailTemplate(id) {
  return request(`/emails/templates/${id}`);
}

export function createEmailTemplate(data) {
  return request("/emails/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEmailTemplate(id, data) {
  return request(`/emails/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEmailTemplate(id) {
  return request(`/emails/templates/${id}`, { method: "DELETE" });
}
