import request from "./client";

export function getDashboard() {
  return request("/dashboard");
}
