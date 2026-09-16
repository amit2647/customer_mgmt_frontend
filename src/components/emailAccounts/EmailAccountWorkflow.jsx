import { useEffect, useState } from "react";

import {
  createEmailAccount,
  getEmailAccount,
  updateEmailAccount,
} from "../../api/emailAccounts";

const STEPS = [
  {
    id: 1,
    title: "Account",
    description: "Account details",
  },
  {
    id: 2,
    title: "SMTP",
    description: "Outbound email",
  },
  {
    id: 3,
    title: "IMAP",
    description: "Inbound email",
  },
  {
    id: 4,
    title: "Review",
    description: "Confirm",
  },
];

const INITIAL_FORM = {
  name: "",
  email_address: "",
  provider: "gmail",
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_secure: false,
  smtp_username: "",
  smtp_password: "",
  imap_host: "imap.gmail.com",
  imap_port: 993,
  imap_secure: true,
  imap_username: "",
  imap_password: "",
  imap_mailbox: "INBOX",
  is_active: true,
};

function EmailAccountWorkflow({ accountId = null, onComplete, onCancel }) {
  const isEditing = Boolean(accountId);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(Boolean(accountId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      if (!accountId) {
        setForm(INITIAL_FORM);
        setStep(1);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getEmailAccount(accountId);
        const account = data?.account || data;

        if (!cancelled) {
          setForm({
            name: account?.name || "",
            email_address: account?.email_address || "",
            provider: account?.provider || "gmail",
            smtp_host: account?.smtp_host || "smtp.gmail.com",
            smtp_port: account?.smtp_port || 587,
            smtp_secure: Boolean(account?.smtp_secure),
            smtp_username: account?.smtp_username || "",
            smtp_password: "",
            imap_host: account?.imap_host || "imap.gmail.com",
            imap_port: account?.imap_port || 993,
            imap_secure: account?.imap_secure !== false,
            imap_username: account?.imap_username || "",
            imap_password: "",
            imap_mailbox: account?.imap_mailbox || "INBOX",
            is_active: account?.is_active !== false,
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          console.error("Failed to load email account:", requestError);

          setError(requestError.message || "Failed to load the email account.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  function validateStep(currentStep) {
    setError("");

    if (currentStep === 1) {
      if (!form.name.trim()) {
        setError("Please enter an account name.");
        return false;
      }

      if (!form.email_address.trim()) {
        setError("Please enter the email address.");
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_address.trim())) {
        setError("Please enter a valid email address.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.smtp_host.trim()) {
        setError("Please enter the SMTP host.");
        return false;
      }

      if (!form.smtp_port || Number(form.smtp_port) <= 0) {
        setError("Please enter a valid SMTP port.");
        return false;
      }

      if (!form.smtp_username.trim()) {
        setError("Please enter the SMTP username.");
        return false;
      }

      if (!isEditing && !form.smtp_password.trim()) {
        setError("Please enter the SMTP password.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.imap_host.trim()) {
        setError("Please enter the IMAP host.");
        return false;
      }

      if (!form.imap_port || Number(form.imap_port) <= 0) {
        setError("Please enter a valid IMAP port.");
        return false;
      }

      if (!form.imap_username.trim()) {
        setError("Please enter the IMAP username.");
        return false;
      }

      if (!isEditing && !form.imap_password.trim()) {
        setError("Please enter the IMAP password.");
        return false;
      }

      if (!form.imap_mailbox.trim()) {
        setError("Please enter the mailbox.");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateStep(step)) {
      return;
    }

    setStep((current) => Math.min(current + 1, STEPS.length));
  }

  function previousStep() {
    setError("");

    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      if (!validateStep(1)) {
        setStep(1);
      } else if (!validateStep(2)) {
        setStep(2);
      } else {
        setStep(3);
      }

      return;
    }

    const payload = {
      name: form.name.trim(),
      email_address: form.email_address.trim(),
      provider: form.provider,
      smtp_host: form.smtp_host.trim(),
      smtp_port: Number(form.smtp_port),
      smtp_secure: Boolean(form.smtp_secure),
      smtp_username: form.smtp_username.trim(),
      imap_host: form.imap_host.trim(),
      imap_port: Number(form.imap_port),
      imap_secure: Boolean(form.imap_secure),
      imap_username: form.imap_username.trim(),
      imap_mailbox: form.imap_mailbox.trim(),
      is_active: Boolean(form.is_active),
    };

    if (form.smtp_password.trim()) {
      payload.smtp_password = form.smtp_password.trim();
    }

    if (form.imap_password.trim()) {
      payload.imap_password = form.imap_password.trim();
    }

    try {
      setSubmitting(true);
      setError("");

      if (isEditing) {
        await updateEmailAccount(accountId, payload);
      } else {
        await createEmailAccount(payload);
      }

      await onComplete();
    } catch (requestError) {
      console.error("Failed to save email account:", requestError);

      setError(
        requestError.message ||
          `Failed to ${isEditing ? "update" : "create"} the email account.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="workflow-loading">
        <div className="loading-spinner" />
        <span>Loading email account...</span>
      </div>
    );
  }

  return (
    <div className="email-account-workflow">
      <div className="email-account-workflow-header">
        <div>
          <span className="workflow-eyebrow">
            {isEditing
              ? "EMAIL ACCOUNT MANAGEMENT"
              : "EMAIL ACCOUNT CONFIGURATION"}
          </span>

          <h2>{isEditing ? "Edit Email Account" : "Add Email Account"}</h2>

          <p>
            {isEditing
              ? "Update the account configuration used by OmniCore for email communication."
              : "Configure an email account for outbound and inbound communication."}
          </p>
        </div>
      </div>

      <div className="workflow-steps email-account-workflow-steps">
        {STEPS.map((item) => {
          const active = step === item.id;
          const completed = step > item.id;

          return (
            <div
              key={item.id}
              className={`workflow-step ${
                active ? "active" : ""
              } ${completed ? "completed" : ""}`}
            >
              <div className="workflow-step-number">
                {completed ? "✓" : item.id}
              </div>

              <div className="workflow-step-content">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="workflow-error">{error}</div>}

      <div className="workflow-body">
        {step === 1 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 01</span>

              <h3>Account Information</h3>

              <p>Configure the identity of this communication account.</p>
            </div>

            <div className="workflow-form-grid">
              <label>
                Account Name
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. OmniCore Support Gmail"
                  autoFocus
                  disabled={submitting}
                />
              </label>

              <label>
                Provider
                <select
                  value={form.provider}
                  onChange={(e) => updateField("provider", e.target.value)}
                  disabled={submitting}
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Microsoft Outlook</option>
                  <option value="smtp">Generic SMTP</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="workflow-field-full">
                Email Address
                <input
                  type="email"
                  value={form.email_address}
                  onChange={(e) => updateField("email_address", e.target.value)}
                  placeholder="support@example.com"
                  disabled={submitting}
                />
              </label>

              <label className="workflow-checkbox workflow-field-full">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                  disabled={submitting}
                />

                <span>
                  <strong>Account active</strong>
                  <small>
                    Active accounts can be used for outbound and inbound email.
                  </small>
                </span>
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 02</span>

              <h3>SMTP Configuration</h3>

              <p>
                Configure the connection OmniCore will use to send outbound
                email.
              </p>
            </div>

            <div className="workflow-form-grid">
              <label>
                SMTP Host
                <input
                  value={form.smtp_host}
                  onChange={(e) => updateField("smtp_host", e.target.value)}
                  placeholder="smtp.gmail.com"
                  disabled={submitting}
                />
              </label>

              <label>
                SMTP Port
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={form.smtp_port}
                  onChange={(e) => updateField("smtp_port", e.target.value)}
                  placeholder="587"
                  disabled={submitting}
                />
              </label>

              <label>
                SMTP Username
                <input
                  value={form.smtp_username}
                  onChange={(e) => updateField("smtp_username", e.target.value)}
                  placeholder="support@example.com"
                  disabled={submitting}
                />
              </label>

              <label>
                SMTP Password
                <input
                  type="password"
                  value={form.smtp_password}
                  onChange={(e) => updateField("smtp_password", e.target.value)}
                  placeholder={
                    isEditing
                      ? "Leave blank to keep current password"
                      : "Password"
                  }
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </label>

              <label className="workflow-checkbox workflow-field-full">
                <input
                  type="checkbox"
                  checked={form.smtp_secure}
                  onChange={(e) => updateField("smtp_secure", e.target.checked)}
                  disabled={submitting}
                />

                <span>
                  <strong>Use secure SMTP connection</strong>
                  <small>
                    Enable SSL/TLS when required by the SMTP provider.
                  </small>
                </span>
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 03</span>

              <h3>IMAP Configuration</h3>

              <p>
                Configure the connection OmniCore will use to receive inbound
                email.
              </p>
            </div>

            <div className="workflow-form-grid">
              <label>
                IMAP Host
                <input
                  value={form.imap_host}
                  onChange={(e) => updateField("imap_host", e.target.value)}
                  placeholder="imap.gmail.com"
                  disabled={submitting}
                />
              </label>

              <label>
                IMAP Port
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={form.imap_port}
                  onChange={(e) => updateField("imap_port", e.target.value)}
                  placeholder="993"
                  disabled={submitting}
                />
              </label>

              <label>
                IMAP Username
                <input
                  value={form.imap_username}
                  onChange={(e) => updateField("imap_username", e.target.value)}
                  placeholder="support@example.com"
                  disabled={submitting}
                />
              </label>

              <label>
                IMAP Password
                <input
                  type="password"
                  value={form.imap_password}
                  onChange={(e) => updateField("imap_password", e.target.value)}
                  placeholder={
                    isEditing
                      ? "Leave blank to keep current password"
                      : "Password"
                  }
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </label>

              <label className="workflow-field-full">
                Mailbox
                <input
                  value={form.imap_mailbox}
                  onChange={(e) => updateField("imap_mailbox", e.target.value)}
                  placeholder="INBOX"
                  disabled={submitting}
                />
              </label>

              <label className="workflow-checkbox workflow-field-full">
                <input
                  type="checkbox"
                  checked={form.imap_secure}
                  onChange={(e) => updateField("imap_secure", e.target.checked)}
                  disabled={submitting}
                />

                <span>
                  <strong>Use secure IMAP connection</strong>
                  <small>
                    Enable SSL/TLS for secure IMAP connections such as port 993.
                  </small>
                </span>
              </label>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="workflow-panel">
            <div className="workflow-panel-heading">
              <span>STEP 04</span>

              <h3>Review Email Account</h3>

              <p>Verify the configuration before saving the email account.</p>
            </div>

            <div className="review-grid">
              <div className="review-card">
                <span>ACCOUNT</span>

                <strong>{form.name || "Unnamed account"}</strong>

                <p>{form.email_address}</p>

                <p>{form.provider}</p>

                <div className="review-status">
                  <strong>{form.is_active ? "Active" : "Inactive"}</strong>
                </div>
              </div>

              <div className="review-card">
                <span>SMTP</span>

                <strong>
                  {form.smtp_host}:{form.smtp_port}
                </strong>

                <p>{form.smtp_username}</p>

                <div className="review-status">
                  <strong>
                    {form.smtp_secure
                      ? "Secure connection"
                      : "Standard connection"}
                  </strong>
                </div>
              </div>

              <div className="review-card">
                <span>IMAP</span>

                <strong>
                  {form.imap_host}:{form.imap_port}
                </strong>

                <p>{form.imap_username}</p>

                <p>{form.imap_mailbox}</p>

                <div className="review-status">
                  <strong>
                    {form.imap_secure
                      ? "Secure connection"
                      : "Standard connection"}
                  </strong>
                </div>
              </div>

              <div className="review-card review-card-full">
                <span>SECURITY</span>

                <div className="review-services">
                  <span>
                    SMTP password{" "}
                    {isEditing && !form.smtp_password
                      ? "unchanged"
                      : "configured"}
                  </span>

                  <span>
                    IMAP password{" "}
                    {isEditing && !form.imap_password
                      ? "unchanged"
                      : "configured"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="workflow-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={step === 1 ? onCancel : previousStep}
          disabled={submitting}
        >
          {step === 1 ? "Back to Email Accounts" : "← Previous"}
        </button>

        {step < STEPS.length ? (
          <button
            type="button"
            className="primary"
            onClick={nextStep}
            disabled={submitting}
          >
            Continue
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Update Email Account"
                : "Create Email Account"}
          </button>
        )}
      </div>
    </div>
  );
}

export default EmailAccountWorkflow;
