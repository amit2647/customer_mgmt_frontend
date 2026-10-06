import request, { requestRaw } from "./client";

/*
 * Clients: customers of an organization with a profession bundle, with their
 * profile (bundle fields, identifiers, people, bank accounts). Same
 * customer-service endpoints as Customers, plus the profile routes.
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export function getClients({ query = "", archived = false } = {}) {
  return request(`/customers?q=${encodeURIComponent(query)}${archived ? "&archived=true" : ""}`);
}

export function getClient(id) {
  return request(`/customers/${id}`);
}

// The wizard's save: core fields, serviceIds and `profile` in one request.
export function createClient(data) {
  return request("/customers", json("POST", data));
}

export function updateClient(id, data) {
  return request(`/customers/${id}`, json("PUT", data));
}

export function updateClientServices(id, serviceIds) {
  return request(`/customers/${id}/services`, json("PUT", { serviceIds }));
}

// Who, if anyone, already holds this identifier (WIZ-11).
export function checkIdentifier(type, value, excludeId) {
  const params = new URLSearchParams({ type, value });

  if (excludeId) params.set("exclude", excludeId);

  return request(`/customers/identifiers/check?${params}`);
}

export function replacePeople(id, people) {
  return request(`/customers/${id}/people`, json("PUT", { people }));
}

export function addBankAccount(id, account) {
  return request(`/customers/${id}/bank-accounts`, json("POST", account));
}

export function setPrimaryBankAccount(id, accountId) {
  return request(`/customers/${id}/bank-accounts/${accountId}/primary`, { method: "POST" });
}

export function removeBankAccount(id, accountId) {
  return request(`/customers/${id}/bank-accounts/${accountId}`, { method: "DELETE" });
}

export function lockClient(id) {
  return request(`/customers/${id}/lock`, { method: "POST" });
}

export function unlockClient(id) {
  return request(`/customers/${id}/lock`, { method: "DELETE" });
}

// Delete archives, for an organization with a bundle.
export function archiveClient(id) {
  return request(`/customers/${id}`, { method: "DELETE" });
}

export function restoreClient(id) {
  return request(`/customers/${id}/restore`, { method: "POST" });
}

export function purgeClient(id) {
  return request(`/customers/${id}/purge`, { method: "DELETE" });
}

// Saves a CSV through the browser (DATA-03, DATA-05).
async function saveCsv(url, fallbackName) {
  const response = await requestRaw(url);
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") || "")?.[1] || fallbackName;
  const link = document.createElement("a");

  link.href = URL.createObjectURL(await response.blob());
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export const downloadImportTemplate = () => saveCsv("/customers/import-template.csv", "client-import-template.csv");

export const exportClients = () => saveCsv("/customers/export.csv", "clients.csv");

// { added, skipped: [{ line, name, reason }], errors: [{ line, name, error }] } (DATA-04)
export async function importClients(text) {
  const response = await requestRaw("/customers/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
  return response.json();
}
