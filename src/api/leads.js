import request from "./client";

/*
 * =========================================================
 * LEADS API
 * =========================================================
 */

/*
 * Get all leads.
 *
 * GET /api/leads
 * GET /api/leads?q=priya
 */
export function getLeads(query = "") {
  return request(`/leads?q=${encodeURIComponent(query)}`);
}

/*
 * Get a single lead.
 *
 * The backend returns the lead together with
 * its assigned services.
 */
export function getLead(id) {
  return request(`/leads/${id}`);
}

/*
 * Create lead.
 *
 * serviceIds can be included.
 */
export function createLead(data) {
  return request("/leads", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/*
 * Update lead information.
 *
 * Service mappings are handled separately.
 */
export function updateLead(id, data) {
  return request(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/*
 * Delete lead.
 */
export function deleteLead(id) {
  return request(`/leads/${id}`, {
    method: "DELETE",
  });
}

/*
 * Convert lead.
 *
 * POST /api/leads/:id/convert
 *
 * Example:
 *
 * POST /api/leads/1/convert
 *
 * Expected response:
 *
 * {
 *   id: 1,
 *   status: "Converted",
 *   ...
 * }
 */
export function convertLead(id) {
  if (!id) {
    throw new Error("Lead ID is required.");
  }

  return request(`/leads/${id}/convert`, {
    method: "POST",
  });
}

/*
 * Get services assigned to a lead.
 */
export function getLeadServices(id) {
  return request(`/leads/${id}/services`);
}

/*
 * Replace services assigned to a lead.
 *
 * Sending [] removes all services.
 */
export function updateLeadServices(id, serviceIds) {
  return request(`/leads/${id}/services`, {
    method: "PUT",
    body: JSON.stringify({
      serviceIds,
    }),
  });
}
