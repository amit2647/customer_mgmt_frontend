import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { startSignIn } from "../../api/auth";
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
function LoginPage() {
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();

  const params = new URLSearchParams(location.search);
  const loginChallenge = params.get("login_challenge");
  const authError = params.get("auth_error");
  const returnTo = location.state?.from?.pathname ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError || "");
  const [expired, setExpired] = useState(false);
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
      .then(({ redirect_to: next }) => window.location.assign(next))
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
    setSubmitting(true);

    try {
      // Leaves the page on success.
      await login(email.trim(), password, loginChallenge);
    } catch (err) {
      // An expired or used challenge cannot be retried: start over.
      setExpired(err.status === 400 && /expired/i.test(err.message || ""));
      setError(err.message || "Unable to sign in.");
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
