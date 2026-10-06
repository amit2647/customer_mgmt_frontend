import request, { requestRaw } from "./client";

/*
 * vault-service (/api/vault): client portal credentials (secrets only ever
 * through a reveal, with a reason) and client files in the object store.
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

// { vaultReady, consent: { category, onFile }, portals: [{ key, name, url, fields, suggested, credential }] }
export function getCredentials(customerId) {
  return request(`/vault/customers/${customerId}/credentials`);
}

// Secret fields left blank keep what is stored.
export function saveCredential(customerId, portalKey, fields) {
  return request(`/vault/customers/${customerId}/credentials/${portalKey}`, json("PUT", { fields }));
}

export function removeCredential(customerId, portalKey) {
  return request(`/vault/customers/${customerId}/credentials/${portalKey}`, { method: "DELETE" });
}

// { portal, secrets } — recorded with the reason.
export function revealCredential(customerId, portalKey, reason) {
  return request(`/vault/customers/${customerId}/credentials/${portalKey}/reveal`, json("POST", { reason }));
}

export function getReveals(customerId) {
  return request(`/vault/customers/${customerId}/reveals`);
}

// { consent: { category, onFile }, files: [...] }
export function getFiles(customerId) {
  return request(`/vault/customers/${customerId}/files`);
}

export async function uploadFile(customerId, file, category) {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await requestRaw(`/vault/customers/${customerId}/files?category=${encodeURIComponent(category)}`, { method: "POST", body: form });
  return response.json();
}

// Saves the file through the browser; it is always a download, never opened.
export async function downloadFile(file) {
  const response = await requestRaw(`/vault/files/${file.id}/download`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");

  link.href = url;
  link.download = file.file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function deleteFile(fileId) {
  return request(`/vault/files/${fileId}`, { method: "DELETE" });
}
