import request from "./client";

export function getServices(query = "") {
  return request(`/services?q=${encodeURIComponent(query)}`);
}

export function getService(id) {
  return request(`/services/${id}`);
}

export function createService(data) {
  return request("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateService(id, data) {
  return request(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteService(id) {
  return request(`/services/${id}`, {
    method: "DELETE",
  });
}
