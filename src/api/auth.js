import request, { clearToken, setToken, getToken } from "./client";

/*
 * =========================================================
 * AUTHENTICATION API
 * =========================================================
 */

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!data?.token) {
    throw new Error(
      "Authentication succeeded but the server did not return an access token.",
    );
  }

  setToken(data.token);

  return data;
}

export function logout() {
  clearToken();
}

export function hasSession() {
  return Boolean(getToken());
}

export function getCurrentUser() {
  return request("/auth/me");
}
