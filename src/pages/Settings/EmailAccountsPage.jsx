import { useCallback, useEffect, useState } from "react";

import {
  activateEmailAccount,
  deactivateEmailAccount,
  deleteEmailAccount,
  getEmailAccounts,
} from "../../api/emailAccounts";

import EmailAccountTable from "../../components/emailAccounts/EmailAccountTable";
import EmailAccountWorkflow from "../../components/emailAccounts/EmailAccountWorkflow";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { toast } from "../../components/ui/feedback";

function EmailAccountsPage() {

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [workflow, setWorkflow] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);

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

      toast.error(requestError.message || "Failed to load email accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function clearMessages() {
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

  async function handleWorkflowComplete() {
    setWorkflow(null);

    toast.success("Email account configuration saved successfully.");

    await loadAccounts();
  }

  async function handleActivate(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await activateEmailAccount(id);

      toast.success("Email account activated successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to activate email account:", requestError);

      toast.error(requestError.message || "Failed to activate email account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await deactivateEmailAccount(id);

      toast.success("Email account deactivated successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to deactivate email account:", requestError);

      toast.error(requestError.message || "Failed to deactivate email account.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      setActionLoading(true);
      clearMessages();

      await deleteEmailAccount(id);

      toast.success("Email account deleted successfully.");

      await loadAccounts();
    } catch (requestError) {
      console.error("Failed to delete email account:", requestError);

      toast.error(requestError.message || "Failed to delete email account.");
    } finally {
      setActionLoading(false);
    }
  }

  if (workflow) {
    return (
      <div className="settings-panel email-accounts-page">
        <Breadcrumb onBack={handleCancelWorkflow} backLabel="Email Accounts" section="SETTINGS" title={workflow.mode === "edit" ? "Edit Email Account" : "Add Email Account"} />

        <EmailAccountWorkflow
          accountId={workflow.accountId}
          onComplete={handleWorkflowComplete}
          onCancel={handleCancelWorkflow}
        />
      </div>
    );
  }

  return (
    <div className="settings-panel email-accounts-page">
      <div className="page-header settings-panel-header">
        <div>
          <h2>Email Accounts</h2>

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
    </div>
  );
}

export default EmailAccountsPage;
