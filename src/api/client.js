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

/*
 * The session (auth-hardening P1): a 5-minute access token from Ory Hydra,
 * held in this module's memory only — never in localStorage, where any script
 * on the page could read it. The refresh token never reaches JavaScript at
 * all: identity-service keeps it in an httpOnly cookie scoped to /api/auth,
 * and POST /auth/refresh trades it for a new access token (rotating it).
 *
 * Refreshing is shared: concurrent callers (StrictMode's double start, several
 * 401s at once) wait on one request. Two rotations of the same refresh token
 * would look like theft to Hydra, which then revokes the whole session.
 */

// Tokens from before P1 were kept here; nothing reads them any more.
try {
  localStorage.removeItem("omnicore_access_token");
} catch {
  // Storage unavailable: there is nothing to clean up.
}

const REFRESH_EARLY_MS = 30 * 1000;

let accessToken = null;
let refreshTimer = null;
let refreshing = null;

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = token || null;
}

export function clearToken() {
  accessToken = null;
  clearTimeout(refreshTimer);
  refreshTimer = null;
}

export function isAuthenticated() {
  return Boolean(accessToken);
}

// Told when a session ends on its own (a refresh refused), so the app can
// return to the sign-in page.
export const SESSION_ENDED = "omnicore:session-ended";

function sessionEnded() {
  const hadSession = Boolean(accessToken);
  clearToken();
  if (hadSession) window.dispatchEvent(new Event(SESSION_ENDED));
}

/*
 * A fresh access token from the refresh cookie, or null when there is no
 * session. Schedules the next refresh shortly before this token expires.
 */
export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch(`${API}/auth/refresh`, { method: "POST", credentials: "include" });

        if (!response.ok) {
          sessionEnded();
          return null;
        }

        const { accessToken: token, expiresIn } = await response.json();
        setToken(token);

        clearTimeout(refreshTimer);
        const delay = Math.max(5 * 1000, (Number(expiresIn) || 300) * 1000 - REFRESH_EARLY_MS);
        refreshTimer = setTimeout(() => {
          refreshSession().catch(() => {});
        }, delay);

        return token;
      } finally {
        refreshing = null;
      }
    })();
  }

  return refreshing;
}

// Ends the session on the server too: the refresh token is revoked.
export async function endSession() {
  clearToken();

  try {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Signed out locally either way; the refresh token expires on its own.
  }
}

export function apiUrl(path) {
  return API + path;
}

async function request(url, options = {}, retried = false) {
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
    // An expired access token: refresh once and try again.
    if (!retried && token && (await refreshSession())) {
      return request(url, options, true);
    }

    sessionEnded();

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

    // A machine-readable reason where the server gives one (e.g.
    // "email_unverified"), so a page can act on it rather than on wording.
    if (data?.code) {
      error.code = data.code;
    }

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
export async function requestRaw(url, options = {}, retried = false) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + url, { ...options, headers });

  if (response.status === 401 && !retried && token && (await refreshSession())) {
    return requestRaw(url, options, true);
  }

  if (!response.ok) {
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) sessionEnded();

    const error = new Error(data?.error || (response.status === 413 ? "That file is too large." : `Request failed with status ${response.status}`));
    error.status = response.status;
    if (data?.details) error.details = data.details;
    throw error;
  }

  return response;
}

export default request;
