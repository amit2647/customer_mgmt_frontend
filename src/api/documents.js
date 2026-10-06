import request from "./client";

/*
 * document-service (/api/documents): the letters a bundle ships as
 * templates, and the documents generated from them per client and period.
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

// The tiles: every template, and whether it applies to this client and period.
export function getDocumentTemplates({ customerId, period } = {}) {
  const params = new URLSearchParams();

  if (customerId) params.set("customerId", customerId);
  if (period) params.set("period", period);

  return request(`/documents/templates?${params}`);
}

export function getDocumentTemplate(key) {
  return request(`/documents/templates/${key}`);
}

// A firm's own revision of the template text (needs system.settings).
export function saveDocumentTemplate(key, body) {
  return request(`/documents/templates/${key}`, json("PUT", { body }));
}

export function restoreDocumentTemplate(key) {
  return request(`/documents/templates/${key}/restore`, { method: "POST" });
}

// Renders without storing; `body` previews unsaved template text.
export function previewDocument(data) {
  return request("/documents/preview", json("POST", data));
}

export function getDocuments(customerId, period) {
  const params = new URLSearchParams({ customerId });
  if (period) params.set("period", period);

  return request(`/documents?${params}`);
}

export function getDocument(id) {
  return request(`/documents/${id}`);
}

export function createDocument(data) {
  return request("/documents", json("POST", data));
}

export function updateDocument(id, fieldValues) {
  return request(`/documents/${id}`, json("PUT", { fieldValues }));
}

export function finalizeDocument(id, udin) {
  return request(`/documents/${id}/finalize`, json("POST", { udin: udin || null }));
}

export function deleteDocument(id) {
  return request(`/documents/${id}`, { method: "DELETE" });
}
