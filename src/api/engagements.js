import request from "./client";

/*
 * engagement-service (/api/engagements): engagements per client and period,
 * the services engaged with their fees, and payments. Organizations with a
 * profession bundle only.
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export function getEngagementTypes() {
  return request("/engagements/types");
}

// Periods generated around today (FIX-21): { current, periods: [{ label, start, end }] }.
export function getPeriods(typeKey) {
  return request(`/engagements/periods?type=${encodeURIComponent(typeKey)}`);
}

export function getEngagements(customerId) {
  return request(`/engagements?customerId=${encodeURIComponent(customerId)}`);
}

export function createEngagement(data) {
  return request("/engagements", json("POST", data));
}

export function updateEngagement(id, data) {
  return request(`/engagements/${id}`, json("PUT", data));
}

export function getPayments(engagementId) {
  return request(`/engagements/${engagementId}/payments`);
}

export function recordPayment(engagementId, data) {
  return request(`/engagements/${engagementId}/payments`, json("POST", data));
}
