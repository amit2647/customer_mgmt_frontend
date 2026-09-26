import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/*
 * Split layout: an abstract gradient panel on the left, the form on the right.
 * The artwork is pure CSS and built entirely from theme tokens, so it re-tints
 * with the selected theme instead of shipping four static images.
 */
function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("amitmahorkar799@gmail.com");
  const [password, setPassword] = useState("amitmahorkar@7");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
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

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
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
