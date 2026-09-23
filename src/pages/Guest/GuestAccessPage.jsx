import { useState } from "react";
import { useParams } from "react-router-dom";

import { getToken, setToken } from "../../api/client";
import { redeemAccessInvite } from "../../api/identity";

/*
 * Where an external guest lands from their invite link.
 *
 * Redeeming is a click rather than something that fires on mount: the link may
 * be opened by someone already signed in, and swapping their session out from
 * under them without asking would be worse than one extra step. It also keeps
 * link previewers and mail scanners from consuming the invite.
 */
function GuestAccessPage() {
  const { token } = useParams();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasExistingSession = Boolean(getToken());

  async function handleRedeem() {
    setError("");
    setSubmitting(true);

    try {
      const session = await redeemAccessInvite(token);

      setToken(session.token);

      // Full reload rather than a route change: AuthProvider reads the token
      // once at startup, so the new session has to start a new app instance.
      window.location.replace("/");
    } catch (err) {
      setError(err.message || "This link could not be opened.");
      setSubmitting(false);
    }
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
            <h2>You have been given temporary access.</h2>

            <p>
              Someone at this workspace shared a limited, time-boxed view with
              you. No account or password is needed.
            </p>
          </div>

          <ul className="login-art-points">
            <li>Only the screens you were granted</li>
            <li>Expires automatically</li>
            <li>Can be withdrawn at any time</li>
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
            <span className="login-eyebrow">Guest access</span>

            <h1>Open your access</h1>

            <p>
              This link grants temporary permission to specific screens. It stops
              working when the access expires or is withdrawn.
            </p>
          </div>

          {hasExistingSession && (
            <div className="login-error" role="status">
              You are already signed in. Continuing will replace your current
              session with this guest access.
            </div>
          )}

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="button"
            className="login-submit"
            onClick={handleRedeem}
            disabled={submitting}
          >
            {submitting ? "Opening..." : "Continue as guest"}
          </button>

          <div className="login-footer">
            <span>OmniCore Customer Platform</span>
            <span>Temporary access</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default GuestAccessPage;
