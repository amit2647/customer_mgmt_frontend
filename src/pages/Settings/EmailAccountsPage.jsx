import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  activateEmailAccount,
  deactivateEmailAccount,
  deleteEmailAccount,
  getEmailAccounts,
} from "../../api/emailAccounts";

import EmailAccountTable from "../../components/emailAccounts/EmailAccountTable";
import EmailAccountWorkflow from "../../components/emailAccounts/EmailAccountWorkflow";

function EmailAccountsPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [workflow, setWorkflow] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getEmailAccounts();

      setAccounts(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.accounts)
            ? data.accounts
            : [],
      );
    } catch (requestError) {
      console.error("Failed to load email accounts:", requestError);

      setError(requestError.message || "Failed to load email accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function handleAdd() {
    clearMessages();

    setWorkflow({
      mode: "create",
      accountId: null,
    });
  }

  function handleEdit(account) {
    clearMessages();

    setWorkflow({
      mode: "edit",
      accountId: account?.id || null,
    });
  }

  function handleCancelWorkflow() {
    setWorkflow(null);
  }

  function handleBackToSettings() {
    navigate("/settings");
  }

  async function handleWorkflowComplete() {
    setWorkflow(null);

    setSuccess("Email account configuration saved successfully.");

    await loadAccounts();
  }

  async function handleActivate(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await activateEmailAccount(id);

      setSuccess("Email account activated successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to activate email account:", requestError);

      setError(requestError.message || "Failed to activate email account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await deactivateEmailAccount(id);

      setSuccess("Email account deactivated successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to deactivate email account:", requestError);

      setError(requestError.message || "Failed to deactivate email account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await deleteEmailAccount(id);

      setSuccess("Email account deleted successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to delete email account:", requestError);

      setError(requestError.message || "Failed to delete email account.");
    } finally {
      setActionLoading(false);
    }
  }

  if (workflow) {
    return (
      <main className="page email-accounts-page">
        <div className="workflow-breadcrumb">
          <button type="button" onClick={handleCancelWorkflow}>
            ← Back to Email Accounts
          </button>

          <div className="workflow-context">
            <span>SETTINGS</span>

            <strong>
              {workflow.mode === "edit"
                ? "Edit Email Account"
                : "Add Email Account"}
            </strong>
          </div>
        </div>

        <EmailAccountWorkflow
          accountId={workflow.accountId}
          onComplete={handleWorkflowComplete}
          onCancel={handleCancelWorkflow}
        />
      </main>
    );
  }

  return (
    <main className="page email-accounts-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={handleBackToSettings}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Email Accounts</strong>
        </div>
      </div>
      <div className="page-header">
        <div>
          <h1>Email Accounts</h1>

          <p>
            Manage the SMTP and IMAP accounts used for OmniCore email
            communication.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={handleAdd}
          >
            + Add Email Account
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" role="status">
          <span>{success}</span>

          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            className="alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <section className="page-section">
        <EmailAccountTable
          accounts={accounts}
          loading={loading}
          actionLoading={actionLoading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      </section>
    </main>
  );
}

export default EmailAccountsPage;
