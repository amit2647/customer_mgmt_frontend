import { useState } from "react";

import { startSignIn, verifyEmail } from "../../api/auth";

/*
 * Where the link from a verification email lands (auth-hardening P4):
 * /verify-email#<token>. The token sits after `#`, so it never reaches a
 * server; the page reads it once and takes it out of the address bar.
 *
 * Confirming is a click, as with guest invites: mail scanners and link
 * previews open links too, and must not use this one up.
 */
function readToken() {
  const token = window.location.hash.slice(1);

  if (token) {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }

  return token;
}

function VerifyEmailPage() {
  const [token] = useState(readToken);
  const [state, setState] = useState(token ? "ready" : "missing");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function confirm() {
    setError("");
    setState("confirming");

    try {
      setResult(await verifyEmail(token));
      setState("done");
    } catch (err) {
      setError(err.message || "This link is not valid or has expired.");
      setState("failed");
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
            <h2>One step before you sign in.</h2>

            <p>Confirming your email address shows it is really yours, so only you can sign in with it.</p>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-brand login-brand-compact">
            <span className="login-brand-mark">OC</span>
            <span className="login-brand-name">OmniCore</span>
          </div>

          <div className="login-heading">
            <span className="login-eyebrow">Email address</span>

            <h1>{state === "done" ? "Email address confirmed" : "Confirm your email address"}</h1>

            <p>
              {state === "done"
                ? result?.changed
                  ? `You now sign in with ${result.email}.`
                  : `${result?.email || "Your address"} is confirmed. You can sign in now.`
                : state === "missing"
                  ? "This page needs the link from your email. Open the email again and use its link."
                  : "Confirm the address this link was sent to. The link works once."}
            </p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error} Ask for a new link from the sign-in page, or from your administrator.
            </div>
          )}

          {state === "done" || state === "missing" || state === "failed" ? (
            <button type="button" className="login-submit" onClick={() => startSignIn("/")}>
              Go to sign in
            </button>
          ) : (
            <button type="button" className="login-submit" onClick={confirm} disabled={state === "confirming"}>
              {state === "confirming" ? "Confirming..." : "Confirm my email address"}
            </button>
          )}

          <div className="login-footer">
            <span>OmniCore Customer Platform</span>
            <span>Email confirmation</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default VerifyEmailPage;
