import request from "./client";

/*
 * The caller's own firm and its signing professionals (identity-service,
 * organizations with a profession bundle only).
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export function getFirm() {
  return request("/organizations/current/profile");
}

export function updateFirm(data) {
  return request("/organizations/current/profile", json("PUT", data));
}

export function getProfessionals() {
  return request("/organizations/current/professionals");
}

export function createProfessional(data) {
  return request("/organizations/current/professionals", json("POST", data));
}

export function updateProfessional(id, data) {
  return request(`/organizations/current/professionals/${id}`, json("PUT", data));
}

export function removeProfessional(id) {
  return request(`/organizations/current/professionals/${id}`, { method: "DELETE" });
}
