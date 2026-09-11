import request from "./client";

/*
 * Get all customers.
 *
 * Optional search:
 * GET /customers?q=amit
 */
export function getCustomers(query = "") {
  return request(`/customers?q=${encodeURIComponent(query)}`);
}

/*
 * Get one customer.
 *
 * The backend also returns assigned services.
 */
export function getCustomer(id) {
  return request(`/customers/${id}`);
}

/*
 * Create customer.
 *
 * serviceIds can be included in the request.
 */
export function createCustomer(data) {
  return request("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/*
 * Update normal customer information.
 *
 * Service mappings are updated separately using
 * updateCustomerServices().
 */
export function updateCustomer(id, data) {
  return request(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/*
 * Delete customer.
 */
export function deleteCustomer(id) {
  return request(`/customers/${id}`, {
    method: "DELETE",
  });
}

/*
 * Get services assigned to a customer.
 */
export function getCustomerServices(id) {
  return request(`/customers/${id}/services`);
}

/*
 * Replace all services assigned to a customer.
 *
 * Example:
 *
 * serviceIds = [1, 3, 5]
 */
export function updateCustomerServices(id, serviceIds) {
  return request(`/customers/${id}/services`, {
    method: "PUT",
    body: JSON.stringify({
      serviceIds,
    }),
  });
}
