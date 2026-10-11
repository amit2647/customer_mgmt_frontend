import request, { apiUrl, endSession, refreshSession } from "./client";

/*
 * =========================================================
 * AUTHENTICATION API
 * =========================================================
 *
 * Sign-in goes through Ory Hydra (auth-hardening P1). The browser is sent to
 * /auth/start, Hydra comes back to our login page with a login_challenge, the
 * page posts the password with it, and the browser follows `redirect_to`
 * through consent and /auth/callback, which sets the refresh cookie. The app
 * then starts with refreshSession().
 */

// Leaves the app for the sign-in flow; `returnTo` is where it ends up after.
// replace(), not assign(): Back must not return to a page that only redirected.
let leaving = false;

export function startSignIn(returnTo = "/") {
  if (leaving) return;
  leaving = true;
  window.location.replace(apiUrl(`/auth/start?returnTo=${encodeURIComponent(returnTo)}`));
}

// The password for Hydra's login_challenge: { redirect_to } to follow.
export function submitLogin(email, password, loginChallenge) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, login_challenge: loginChallenge }),
  });
}

// An access token from the refresh cookie, or null when not signed in.
export function restoreSession() {
  return refreshSession();
}

export function logout() {
  return endSession();
}

// Every session of the signed-in user, on every device, this one included
// (auth-hardening P3). Throws if the server could not end them, so the person
// is never told their other devices are signed out when they are not.
export async function signOutEverywhere() {
  await request("/auth/sessions/revoke", { method: "POST" });
  await endSession();
}

// Email verification (auth-hardening P4). The token comes from the link's
// fragment; nothing here ever puts it in a URL.
export function verifyEmail(token) {
  return request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

// Always answers the same, whether or not the address needs confirming.
export function resendVerification(email) {
  return request("/auth/verify-email/resend", { method: "POST", body: JSON.stringify({ email }) });
}

export function getCurrentUser() {
  return request("/auth/me");
}
