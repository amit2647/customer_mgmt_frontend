import { useEffect, useState } from "react";

const EMPTY_FORM = {
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

function EmailAccountForm({
  account = null,
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(account);

  useEffect(() => {
    if (!account) {
      setForm(EMPTY_FORM);
      setErrors({});
      return;
    }

    setForm({
      name: account.name || "",
      email_address: account.email_address || "",
      provider: account.provider || "gmail",
      smtp_host: account.smtp_host || "smtp.gmail.com",
      smtp_port: account.smtp_port || 587,
      smtp_secure: Boolean(account.smtp_secure),
      smtp_username: account.smtp_username || "",
      smtp_password: "",
      imap_host: account.imap_host || "imap.gmail.com",
      imap_port: account.imap_port || 993,
      imap_secure: account.imap_secure !== false,
      imap_username: account.imap_username || "",
      imap_password: "",
      imap_mailbox: account.imap_mailbox || "INBOX",
      is_active: account.is_active !== false,
    });

    setErrors({});
  }, [account]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Account name is required.";
    }

    if (!form.email_address.trim()) {
      nextErrors.email_address = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_address.trim())) {
      nextErrors.email_address = "Enter a valid email address.";
    }

    if (!form.smtp_host.trim()) {
      nextErrors.smtp_host = "SMTP host is required.";
    }

    if (!form.smtp_port || Number(form.smtp_port) <= 0) {
      nextErrors.smtp_port = "Enter a valid SMTP port.";
    }

    if (!form.smtp_username.trim()) {
      nextErrors.smtp_username = "SMTP username is required.";
    }

    if (!isEditMode && !form.smtp_password.trim()) {
      nextErrors.smtp_password = "SMTP password is required.";
    }

    if (!form.imap_host.trim()) {
      nextErrors.imap_host = "IMAP host is required.";
    }

    if (!form.imap_port || Number(form.imap_port) <= 0) {
      nextErrors.imap_port = "Enter a valid IMAP port.";
    }

    if (!form.imap_username.trim()) {
      nextErrors.imap_username = "IMAP username is required.";
    }

    if (!isEditMode && !form.imap_password.trim()) {
      nextErrors.imap_password = "IMAP password is required.";
    }

    if (!form.imap_mailbox.trim()) {
      nextErrors.imap_mailbox = "Mailbox is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
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

    await onSubmit(payload);
  }

  return (
    <form className="email-account-form" onSubmit={handleSubmit}>
      <div className="email-account-form-header">
        <div>
          <h2>{isEditMode ? "Edit Email Account" : "Add Email Account"}</h2>
          <p>
            Configure the SMTP and IMAP connection used by OmniCore for email
            communication.
          </p>
        </div>
      </div>

      <section className="email-account-form-section">
        <div className="email-account-section-heading">
          <h3>Account</h3>
          <p>Basic information about this communication account.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Account Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="OmniCore Support Gmail"
              disabled={loading}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Microsoft Outlook</option>
              <option value="smtp">Generic SMTP</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="email_address">Email Address</label>
            <input
              id="email_address"
              name="email_address"
              type="email"
              value={form.email_address}
              onChange={handleChange}
              placeholder="support@example.com"
              disabled={loading}
            />
            {errors.email_address && (
              <span className="form-error">{errors.email_address}</span>
            )}
          </div>

          <div className="form-field form-field-full">
            <label className="checkbox-field">
              <input
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={handleChange}
                disabled={loading}
              />
              <span>
                <strong>Account active</strong>
                <small>
                  Active accounts can be used for outbound and inbound email.
                </small>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="email-account-form-section">
        <div className="email-account-section-heading">
          <h3>SMTP Configuration</h3>
          <p>Used to send outbound email from OmniCore.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="smtp_host">SMTP Host</label>
            <input
              id="smtp_host"
              name="smtp_host"
              type="text"
              value={form.smtp_host}
              onChange={handleChange}
              placeholder="smtp.gmail.com"
              disabled={loading}
            />
            {errors.smtp_host && (
              <span className="form-error">{errors.smtp_host}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="smtp_port">SMTP Port</label>
            <input
              id="smtp_port"
              name="smtp_port"
              type="number"
              min="1"
              max="65535"
              value={form.smtp_port}
              onChange={handleChange}
              placeholder="587"
              disabled={loading}
            />
            {errors.smtp_port && (
              <span className="form-error">{errors.smtp_port}</span>
            )}
          </div>

          <div className="form-field form-field-full">
            <label className="checkbox-field">
              <input
                name="smtp_secure"
                type="checkbox"
                checked={form.smtp_secure}
                onChange={handleChange}
                disabled={loading}
              />
              <span>
                <strong>Use secure SMTP connection</strong>
                <small>
                  Enable this when the SMTP provider requires an SSL/TLS
                  connection.
                </small>
              </span>
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="smtp_username">SMTP Username</label>
            <input
              id="smtp_username"
              name="smtp_username"
              type="text"
              value={form.smtp_username}
              onChange={handleChange}
              placeholder="support@example.com"
              disabled={loading}
            />
            {errors.smtp_username && (
              <span className="form-error">{errors.smtp_username}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="smtp_password">
              SMTP Password
              {isEditMode && <span className="field-hint">Optional</span>}
            </label>
            <input
              id="smtp_password"
              name="smtp_password"
              type="password"
              value={form.smtp_password}
              onChange={handleChange}
              placeholder={
                isEditMode ? "Leave blank to keep current password" : "Password"
              }
              autoComplete="new-password"
              disabled={loading}
            />
            {errors.smtp_password && (
              <span className="form-error">{errors.smtp_password}</span>
            )}
          </div>
        </div>
      </section>

      <section className="email-account-form-section">
        <div className="email-account-section-heading">
          <h3>IMAP Configuration</h3>
          <p>Used to receive inbound email and maintain conversations.</p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="imap_host">IMAP Host</label>
            <input
              id="imap_host"
              name="imap_host"
              type="text"
              value={form.imap_host}
              onChange={handleChange}
              placeholder="imap.gmail.com"
              disabled={loading}
            />
            {errors.imap_host && (
              <span className="form-error">{errors.imap_host}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="imap_port">IMAP Port</label>
            <input
              id="imap_port"
              name="imap_port"
              type="number"
              min="1"
              max="65535"
              value={form.imap_port}
              onChange={handleChange}
              placeholder="993"
              disabled={loading}
            />
            {errors.imap_port && (
              <span className="form-error">{errors.imap_port}</span>
            )}
          </div>

          <div className="form-field form-field-full">
            <label className="checkbox-field">
              <input
                name="imap_secure"
                type="checkbox"
                checked={form.imap_secure}
                onChange={handleChange}
                disabled={loading}
              />
              <span>
                <strong>Use secure IMAP connection</strong>
                <small>
                  Enable this for SSL/TLS IMAP connections such as port 993.
                </small>
              </span>
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="imap_username">IMAP Username</label>
            <input
              id="imap_username"
              name="imap_username"
              type="text"
              value={form.imap_username}
              onChange={handleChange}
              placeholder="support@example.com"
              disabled={loading}
            />
            {errors.imap_username && (
              <span className="form-error">{errors.imap_username}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="imap_password">
              IMAP Password
              {isEditMode && <span className="field-hint">Optional</span>}
            </label>
            <input
              id="imap_password"
              name="imap_password"
              type="password"
              value={form.imap_password}
              onChange={handleChange}
              placeholder={
                isEditMode ? "Leave blank to keep current password" : "Password"
              }
              autoComplete="new-password"
              disabled={loading}
            />
            {errors.imap_password && (
              <span className="form-error">{errors.imap_password}</span>
            )}
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="imap_mailbox">Mailbox</label>
            <input
              id="imap_mailbox"
              name="imap_mailbox"
              type="text"
              value={form.imap_mailbox}
              onChange={handleChange}
              placeholder="INBOX"
              disabled={loading}
            />
            {errors.imap_mailbox && (
              <span className="form-error">{errors.imap_mailbox}</span>
            )}
          </div>
        </div>
      </section>

      <div className="email-account-form-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="button button-primary"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : isEditMode
              ? "Save Changes"
              : "Create Account"}
        </button>
      </div>
    </form>
  );
}

export default EmailAccountForm;
