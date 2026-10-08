import request from "./client";

/*
 * obligation-service (/api/obligations): compliance deadlines generated from
 * each client's engaged services, their rules and extensions, reminders.
 */

const json = (method, body) => ({ method, body: JSON.stringify(body) });

// { today, counts: { overdue, due_soon, in_progress, upcoming, completed }, items }
export function getDeadlines({ period, customerId, state } = {}) {
  const params = new URLSearchParams();

  if (period) params.set("period", period);
  if (customerId) params.set("customerId", customerId);
  if (state) params.set("state", state);

  return request(`/obligations?${params}`);
}

// One client's period, grouped by service (CD-07).
export function getClientDeadlines(customerId, period) {
  return request(`/obligations/customers/${customerId}?period=${encodeURIComponent(period || "")}`);
}

export function updateDeadline(id, data) {
  return request(`/obligations/${id}`, json("PATCH", data));
}

export function getRules() {
  return request("/obligations/rules");
}

export function setRuleActive(key, isActive) {
  return request(`/obligations/rules/${key}`, json("PATCH", { isActive }));
}

export function setExtension(key, periodKey, data) {
  return request(`/obligations/rules/${key}/overrides/${encodeURIComponent(periodKey)}`, json("PUT", data));
}

export function removeExtension(key, periodKey) {
  return request(`/obligations/rules/${key}/overrides/${encodeURIComponent(periodKey)}`, { method: "DELETE" });
}

export function runReminders() {
  return request("/obligations/reminders/run", { method: "POST" });
}

// A firm's own deadline rule, or a change to one (its service never changes).
export function createRule(data) {
  return request("/obligations/rules", json("POST", data));
}

export function updateRule(key, data) {
  return request(`/obligations/rules/${key}`, json("PUT", data));
}

export function removeRule(key) {
  return request(`/obligations/rules/${key}`, { method: "DELETE" });
}
