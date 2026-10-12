import { useState } from "react";

import { useAuth } from "../../context/AuthContext";
import RecoveryCodes from "../../components/auth/RecoveryCodes";

/*
 * The step after a correct password when two-factor applies (P5), in the
 * login page's own panel:
 *
 *   verify  a code from the authenticator app, or a recovery code
 *   enrol   the organization requires two-factor and this person has none:
 *           scan, then the first code switches it on and signs in
 *
 * After an enrolment the recovery codes are shown once before the browser
 * goes on to Hydra.
 */
function TwoFactorStep({ step, loginChallenge, onRestart, onDone }) {
  const { loginCode } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await loginCode(step.mfaToken, code.trim(), loginChallenge);
      if (result?.recoveryCodes) {
        setSaved(result);
        setSubmitting(false);
        return;
      }
      onDone();
    } catch (err) {
      setLocked(err.code === "mfa_locked");
      setError(err.message || "That code did not work.");
      setCode("");
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <div className="login-form">
        <div className="login-heading">
          <span className="login-eyebrow">Two-factor sign-in</span>
          <h1>Save your recovery codes</h1>
          <p>Each one signs you in once if you lose your phone. Keep them somewhere safe — they are shown only now.</p>
        </div>

        <RecoveryCodes codes={saved.recoveryCodes} />

        <button
          type="button"
          className="login-submit"
          onClick={() => {
            onDone();
            window.location.assign(saved.redirect_to);
          }}
        >
          I have saved them — continue
        </button>
      </div>
    );
  }

  const enrolling = step.mfa === "enrol";

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-heading">
        <span className="login-eyebrow">Two-factor sign-in</span>
        <h1>{enrolling ? "Set up two-factor sign-in" : "Enter your code"}</h1>
        <p>
          {enrolling
            ? "Your organization requires a second step at sign-in. Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), then enter the code it shows."
            : "Open your authenticator app and enter the 6-digit code for OmniCore. Lost your phone? Enter one of your recovery codes instead."}
        </p>
      </div>

      {enrolling && (
        <div className="mfa-setup">
          <img src={step.qrDataUrl} alt="QR code to scan with an authenticator app" width="180" height="180" />
          <p>
            Can&apos;t scan it? Enter this key in the app: <code>{step.secret}</code>
          </p>
        </div>
      )}

      <label>
        {enrolling ? "Code from the app" : "Code"}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode={enrolling ? "numeric" : "text"}
          autoComplete="one-time-code"
          placeholder={enrolling ? "123456" : "123456 or a recovery code"}
          maxLength={20}
          disabled={submitting || locked}
          required
          autoFocus
        />
      </label>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      {locked ? (
        <button type="button" className="login-submit" onClick={onRestart}>
          Start again
        </button>
      ) : (
        <button type="submit" className="login-submit" disabled={submitting || !code.trim()}>
          {submitting ? "Checking..." : enrolling ? "Turn on and sign in" : "Verify"}
        </button>
      )}
    </form>
  );
}

export default TwoFactorStep;
