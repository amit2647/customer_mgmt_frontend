/*
 * The Kong gateway, not a service — the frontend never addresses a backend
 * service directly.
 *
 * VITE_ is the only prefix Vite exposes to browser code. Its value is read when
 * the dev server starts (or at build time) and baked into what the browser
 * receives, so changing it needs a restart of the frontend container — it is
 * not read per request. The fallback matches KONG_HOST_PORT's own default,
 * which is why the stack works with no configuration at all.
 */
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

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

    // Field-by-field reasons (e.g. { "identifiers.cin": "CIN is required" }),
    // so a form can mark the fields themselves.
    if (data?.details) {
      error.details = data.details;
    }

    throw error;
  }

  return data;
}

/*
 * The same call for bodies and responses that are not JSON — a multipart
 * upload, a file download. The browser sets the upload's content type
 * (with its boundary); the caller reads the Response itself.
 */
export async function requestRaw(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + url, { ...options, headers });

  if (!response.ok) {
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) clearToken();

    const error = new Error(data?.error || (response.status === 413 ? "That file is too large." : `Request failed with status ${response.status}`));
    error.status = response.status;
    if (data?.details) error.details = data.details;
    throw error;
  }

  return response;
}

export default request;
