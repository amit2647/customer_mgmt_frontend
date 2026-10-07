import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { completeSetup } from "../../api/setup";
import WizardSteps, { goToStep } from "../../components/ui/WizardSteps";
import { useAuth } from "../../context/AuthContext";

/*
 * First-run setup of a new installation: name the organization, choose the
 * administrator's own login, and prove access to the server with the one-time
 * code the migrate container printed to its log. Shown instead of everything
 * else until it is done; the server closes setup for good once an admin exists.
 * Same split layout as sign-in, since it is the screen before it.
 */

// The Profession step appears when the deployment installs a bundle at setup.
function stepsFor(bundle) {
  const titles = [
    ["organization", "Organization", "Name, time zone, currency"],
    ...(bundle ? [["profession", "Profession", "What is installed"]] : []),
    ["admin", "Administrator", "Your own sign-in"],
    ["confirm", "Confirm", "Setup code and finish"],
  ];
  return titles.map(([key, title, description], index) => ({ id: index + 1, key, title, description }));
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];
const MIN_PASSWORD = 12;


function timeZones(current) {
  const listed = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set([current, ...listed].filter(Boolean))].sort();
}

function SetupPage({ status, onComplete }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const suggested = status?.organization || {};
  const bundle = status?.bundle || null;
  const steps = useMemo(() => stepsFor(bundle), [bundle]);
  const keyOf = (id) => steps.find((item) => item.id === id)?.key;
  const idOf = (key) => steps.find((item) => item.key === key)?.id;

  // Which step a server-side field error belongs to.
  const stepOf = (field) => idOf(field.startsWith("organization.") ? "organization" : field.startsWith("admin.") ? "admin" : "confirm");

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    organizationName: suggested.name && suggested.name !== "My organization" ? suggested.name : "",
    timeZone: suggested.timeZone || "Asia/Kolkata",
    currency: suggested.currency || "INR",
    adminName: "",
    email: "",
    password: "",
    confirm: "",
    code: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const zones = useMemo(() => timeZones(form.timeZone), [form.timeZone]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const fieldError = (key) => errors[key] && <span className="field-error">{errors[key]}</span>;

  function validateStep(current) {
    const found = {};
    const key = keyOf(current);

    if (key === "organization" && form.organizationName.trim().length < 2) found.organizationName = "Enter the organization's name";

    if (key === "admin") {
      if (form.adminName.trim().length < 2) found.adminName = "Enter your name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = "Enter a valid email address";
      if (form.password.length < MIN_PASSWORD) found.password = `Use at least ${MIN_PASSWORD} characters`;
      else if (form.password.toLowerCase() === form.email.trim().toLowerCase()) found.password = "The password cannot be the email address";
      if (form.confirm !== form.password) found.confirm = "The passwords do not match";
    }

    if (key === "confirm" && form.code.replace(/[^a-z0-9]/gi, "").length < 16) found.code = "Enter the 16-character setup code";

    setErrors((existing) => ({ ...existing, ...found }));
    return Object.keys(found).length === 0;
  }

  async function finish(event) {
    event.preventDefault();

    for (const { id: current } of steps) {
      if (!validateStep(current)) {
        setStep(current);
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const result = await completeSetup({
        code: form.code,
        organization: { name: form.organizationName.trim(), timeZone: form.timeZone, currency: form.currency },
        admin: { name: form.adminName.trim(), email: form.email.trim(), password: form.password },
      });

      // Set up: sign straight in. The product tour is for people joining later.
      try {
        localStorage.setItem("omnicore-onboarding-completed", "true");
      } catch {
        // Private mode: the tour simply shows once.
      }
      await login(form.email.trim(), form.password);
      onComplete?.();

      // Setup is done either way; an install that stopped is resumed from Settings.
      if (result?.bundle?.status === "failed") {
        navigate("/settings/bundle", { replace: true, state: { setupBundleError: result.bundle.error } });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const details = error.details || {};
      const mapped = {
        organizationName: details["organization.name"],
        timeZone: details["organization.timeZone"],
        currency: details["organization.currency"],
        adminName: details["admin.name"],
        email: details["admin.email"],
        password: details["admin.password"],
        code: details.code,
      };
      const first = Object.keys(details)[0];

      setErrors(Object.fromEntries(Object.entries(mapped).filter(([, value]) => value)));
      setMessage(error.message || "Setup did not finish.");
      if (first) setStep(stepOf(first));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-page setup-page">
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
            <h2>Set up your workspace.</h2>
            <p>Name your organization and choose your own administrator login. It takes a minute, and you can change any of it later in Settings.</p>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form-wrap setup-form-wrap" aria-label="Set up OmniCore" onSubmit={finish} noValidate>
          <div className="login-heading">
            <span className="login-eyebrow">New installation</span>
            <h1>Set up OmniCore</h1>
          </div>

          <WizardSteps steps={steps} current={step} className="setup-steps" onSelect={(target) => goToStep(target, { step, validateStep, setStep })} />

          {message && <div className="login-error" role="alert">{message}</div>}

          <div className="login-form setup-form">
            {keyOf(step) === "organization" && (
              <>
                <label>
                  Organization name
                  <input value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} autoFocus placeholder="e.g. Mehta & Associates" />
                  {fieldError("organizationName")}
                </label>
                <label>
                  Time zone
                  <select value={form.timeZone} onChange={(e) => update("timeZone", e.target.value)}>
                    {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                  {fieldError("timeZone")}
                </label>
                <label>
                  Currency
                  <select value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                    {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                  {fieldError("currency")}
                </label>
              </>
            )}

            {keyOf(step) === "profession" && (
              <section className="setup-bundle" aria-label="Profession bundle">
                <span className="setup-bundle-eyebrow">Installed with your workspace</span>
                <strong>{bundle.name}{bundle.version ? <span className="setup-bundle-version"> {bundle.version}</span> : null}</strong>
                {bundle.description && <p>{bundle.description}</p>}
                {bundle.contents && (
                  <ul>
                    <li>{bundle.contents.services} services{bundle.contents.packages ? ` and ${bundle.contents.packages} packages` : ""}</li>
                    {bundle.contents.roles?.length > 0 && <li>Role templates: {bundle.contents.roles.join(", ")}</li>}
                    {bundle.contents.emails > 0 && <li>{bundle.contents.emails} reminder emails, switched off until you turn them on</li>}
                  </ul>
                )}
                <span className="setup-hint">Everything it adds can be edited later; your edits are kept when a newer version arrives.</span>
              </section>
            )}

            {keyOf(step) === "admin" && (
              <>
                <label>
                  Your name
                  <input value={form.adminName} onChange={(e) => update("adminName", e.target.value)} autoFocus autoComplete="name" />
                  {fieldError("adminName")}
                </label>
                <label>
                  Email
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
                  {fieldError("email")}
                </label>
                <label>
                  Password
                  <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" />
                  <span className="setup-hint">At least {MIN_PASSWORD} characters. A short phrase is easiest to remember.</span>
                  {fieldError("password")}
                </label>
                <label>
                  Confirm password
                  <input type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} autoComplete="new-password" />
                  {fieldError("confirm")}
                </label>
              </>
            )}

            {keyOf(step) === "confirm" && (
              <>
                <dl className="setup-summary">
                  <div><dt>Organization</dt><dd>{form.organizationName || "—"} · {form.timeZone} · {form.currency}</dd></div>
                  {bundle && <div><dt>Profession</dt><dd>{bundle.name}</dd></div>}
                  <div><dt>Administrator</dt><dd>{form.adminName || "—"} · {form.email || "—"}</dd></div>
                </dl>
                <label>
                  Setup code
                  <input value={form.code} onChange={(e) => update("code", e.target.value)} autoFocus autoComplete="off" spellCheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" className="setup-code" />
                  <span className="setup-hint">
                    Printed on the server when it started. Run <code>docker compose logs migrate</code> to see it.
                  </span>
                  {fieldError("code")}
                </label>
              </>
            )}
          </div>

          <div className="setup-actions">
            {step > 1 ? (
              <button type="button" className="secondary-button" onClick={() => setStep(step - 1)} disabled={saving}>← Back</button>
            ) : <span />}
            {step < steps.length ? (
              <button type="button" className="login-submit setup-next" onClick={() => goToStep(step + 1, { step, validateStep, setStep })}>Continue →</button>
            ) : (
              <button type="submit" className="login-submit setup-next" disabled={saving}>{saving ? (bundle ? `Setting up and installing ${bundle.name}...` : "Setting up...") : "Finish setup"}</button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

export default SetupPage;
