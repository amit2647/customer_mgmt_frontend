import { useState } from "react";

function EmailAccountTable({
  accounts = [],
  loading = false,
  actionLoading = false,
  onAdd,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}) {
  const [deleteAccount, setDeleteAccount] = useState(null);

  function formatProvider(provider) {
    if (!provider) {
      return "Other";
    }

    const providers = {
      gmail: "Gmail",
      outlook: "Microsoft Outlook",
      smtp: "SMTP",
      other: "Other",
    };

    return providers[provider] || provider;
  }

  function formatServer(host, port) {
    if (!host) {
      return "Not configured";
    }

    return `${host}:${port || ""}`;
  }

  async function handleDelete() {
    if (!deleteAccount) {
      return;
    }

    await onDelete(deleteAccount.id);
    setDeleteAccount(null);
  }

  if (loading) {
    return (
      <div className="email-account-list">
        <div className="email-account-loading">
          <div className="loading-spinner" />
          <span>Loading email accounts...</span>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="email-account-empty">
        <div className="email-account-empty-icon">@</div>
        <h3>No email accounts configured</h3>
        <p>
          Add an email account to enable outbound and inbound email
          communication.
        </p>
        <button type="button" className="button button-primary" onClick={onAdd}>
          Add Email Account
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="email-account-list">
        {accounts.map((account) => (
          <article className="email-account-card" key={account.id}>
            <div className="email-account-card-header">
              <div className="email-account-identity">
                <div className="email-account-avatar">@</div>

                <div>
                  <h3>{account.name}</h3>

                  <p>{account.email_address}</p>
                </div>
              </div>

              <div
                className={`email-account-status ${
                  account.is_active ? "active" : "inactive"
                }`}
              >
                <span className="email-account-status-dot" />
                {account.is_active ? "Active" : "Inactive"}
              </div>
            </div>

            <div className="email-account-provider">
              <span className="email-account-provider-label">Provider</span>

              <span className="email-account-provider-value">
                {formatProvider(account.provider)}
              </span>
            </div>

            <div className="email-account-connections">
              <div className="email-account-connection">
                <div className="email-account-connection-icon">↗</div>

                <div className="email-account-connection-content">
                  <span className="email-account-connection-label">SMTP</span>

                  <strong>
                    {formatServer(account.smtp_host, account.smtp_port)}
                  </strong>

                  <small>
                    {account.smtp_secure
                      ? "Secure connection"
                      : "Standard connection"}
                  </small>
                </div>
              </div>

              <div className="email-account-connection">
                <div className="email-account-connection-icon">↙</div>

                <div className="email-account-connection-content">
                  <span className="email-account-connection-label">IMAP</span>

                  <strong>
                    {formatServer(account.imap_host, account.imap_port)}
                  </strong>

                  <small>
                    {account.imap_mailbox || "INBOX"}
                    {" · "}
                    {account.imap_secure
                      ? "Secure connection"
                      : "Standard connection"}
                  </small>
                </div>
              </div>
            </div>

            <div className="email-account-card-footer">
              <span className="email-account-updated">
                {account.updated_at
                  ? `Updated ${new Date(account.updated_at).toLocaleString()}`
                  : "Configuration available"}
              </span>

              <div className="email-account-actions">
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => onEdit(account)}
                  disabled={actionLoading}
                >
                  Edit
                </button>

                {account.is_active ? (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => onDeactivate(account.id)}
                    disabled={actionLoading}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-primary button-small"
                    onClick={() => onActivate(account.id)}
                    disabled={actionLoading}
                  >
                    Activate
                  </button>
                )}

                <button
                  type="button"
                  className="button button-danger button-small"
                  onClick={() => setDeleteAccount(account)}
                  disabled={actionLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {deleteAccount && (
        <div className="modal-backdrop">
          <div
            className="modal email-account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-email-account-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="delete-email-account-title">Delete Email Account</h2>

                <p>This action cannot be undone.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setDeleteAccount(null)}
                disabled={actionLoading}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteAccount.name}</strong>?
              </p>

              <p>
                Existing email conversations and communications will remain, but
                this email account configuration will be removed.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setDeleteAccount(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button-danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EmailAccountTable;
