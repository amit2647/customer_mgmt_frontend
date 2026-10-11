import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { resendVerification, startSignIn } from "../../api/auth";
import { redeemAccessInvite, takePendingInvite } from "../../api/identity";
import { useAuth } from "../../context/AuthContext";

/*
 * Split layout: an abstract gradient panel on the left, the form on the right.
 * The artwork is pure CSS and built entirely from theme tokens, so it re-tints
 * with the selected theme instead of shipping four static images.
 *
 * Sign-in goes through Ory Hydra (auth-hardening P1). Hydra sends the browser
 * here with a login_challenge; the form posts the password with it and the
 * browser follows Hydra's next step. Opened without one (a bookmark, a signed-
 * out redirect), the page starts the flow itself. A guest's invite link enters
 * the same flow: their pending invite is redeemed with the challenge instead
 * of a password.
 */
/*
 * Hydra's login_challenge is a long opaque string nobody needs to see. The
 * page takes it (and any auth_error) from the address once, keeps the
 * challenge in sessionStorage so a reload still signs in, and shows plain
 * /login. Hydra's own lifetime for it is 30 minutes; after 10 the page simply
 * starts a fresh sign-in instead of offering a form that may fail.
 */
const CHALLENGE_KEY = "omnicore_login_challenge";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function keepChallenge(fromAddress) {
  try {
    if (fromAddress) {
      sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify({ value: fromAddress, at: Date.now() }));
      return fromAddress;
    }

    const saved = JSON.parse(sessionStorage.getItem(CHALLENGE_KEY) || "null");
    return saved && Date.now() - saved.at < CHALLENGE_TTL_MS ? saved.value : null;
  } catch {
    return fromAddress || null;
  }
}

function forgetChallenge() {
  try {
    sessionStorage.removeItem(CHALLENGE_KEY);
  } catch {
    // Nothing was kept.
  }
}

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();

  const [params] = useState(() => new URLSearchParams(location.search));
  const [loginChallenge] = useState(() => keepChallenge(params.get("login_challenge")));
  const authError = params.get("auth_error");

  // Read once above; now take them out of the address bar (replace, so Back
  // does not return to the long address).
  useEffect(() => {
    if (location.search) navigate({ pathname: location.pathname }, { replace: true, state: location.state });
  }, [location.search, location.pathname, location.state, navigate]);
  const returnTo = location.state?.from?.pathname ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError || "");
  const [expired, setExpired] = useState(false);
  // The password was right but the address is not confirmed yet (P4).
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mustStart = !loading && !isAuthenticated && !loginChallenge && !authError;

  useEffect(() => {
    if (mustStart) startSignIn(returnTo);
  }, [mustStart, returnTo]);

  // A guest who opened an invite link: redeem it for this challenge.
  useEffect(() => {
    if (!loginChallenge) return;
    const invite = takePendingInvite();
    if (!invite) return;

    setSubmitting(true);
    redeemAccessInvite(invite, loginChallenge)
      .then(({ redirect_to: next }) => {
        forgetChallenge();
        window.location.assign(next);
      })
      .catch((err) => {
        setError(err.message || "This link could not be opened.");
        setSubmitting(false);
      });
  }, [loginChallenge]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!loginChallenge) {
      startSignIn(returnTo);
      return;
    }

    setError("");
    setUnverified(false);
    setResent("");
    setSubmitting(true);

    try {
      // Leaves the page on success; the challenge is used up.
      await login(email.trim(), password, loginChallenge);
      forgetChallenge();
    } catch (err) {
      // An expired or used challenge cannot be retried: start over. A wrong
      // password keeps it, so the person can simply try again.
      const isExpired = err.status === 400 && /expired/i.test(err.message || "");
      if (isExpired) forgetChallenge();
      setExpired(isExpired);
      setUnverified(err.code === "email_unverified");
      setError(err.message || "Unable to sign in.");
      setSubmitting(false);
    }
  }

  async function sendLinkAgain() {
    setResent("");
    setSubmitting(true);

    try {
      const { message } = await resendVerification(email.trim());
      setResent(message || "A new link is on its way.");
    } catch (err) {
      setResent(err.message || "The link could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && isAuthenticated && !loginChallenge) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <main className="login-page">
      <section className="login-art" aria-hidden="true">
        <span className="login-blob login-blob-a" />
        <span className="login-blob login-blob-b" />
        <span className="login-blob login-blob-c" />
        <span className="login-grid" />

        <div className="login-art-content">
          <div className="login-brand">
            <span className="login-brand-mark">OC</span>
            <span className="login-brand-name">OmniCore</span>
          </div>

          <div className="login-art-copy">
            <h2>Every lead, customer and conversation in one place.</h2>

            <p>
              Capture leads, convert them to customers, and keep the whole email
              thread attached to the record.
            </p>
          </div>

          <ul className="login-art-points">
            <li>Lead capture and scoring</li>
            <li>One-click conversion</li>
            <li>Email built in</li>
          </ul>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-brand login-brand-compact">
            <span className="login-brand-mark">OC</span>
            <span className="login-brand-name">OmniCore</span>
          </div>

          <div className="login-heading">
            <span className="login-eyebrow">Secure access</span>

            <h1>Welcome back</h1>

            <p>Sign in to your customer management workspace.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>Password</span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            {unverified && !resent && (
              <button type="button" className="login-resend" onClick={sendLinkAgain} disabled={submitting}>
                Send the link again
              </button>
            )}

            {resent && (
              <div className="login-notice" role="status">
                {resent}
              </div>
            )}

            {expired || (authError && !loginChallenge) ? (
              <button type="button" className="login-submit" onClick={() => startSignIn(returnTo)}>
                Start again
              </button>
            ) : (
              <button type="submit" className="login-submit" disabled={submitting || !loginChallenge}>
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            )}
          </form>

          <div className="login-footer">
            <span>OmniCore Customer Platform</span>
            <span>SOA MVP</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
