const API = "http://localhost:8080/api";

const TOKEN_KEY = "omnicore_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

async function request(url, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + url, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    clearToken();

    const error = new Error(
      data?.error || "Your session has expired. Please sign in again.",
    );

    error.status = 401;

    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || `Request failed with status ${response.status}`,
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

export default request;
