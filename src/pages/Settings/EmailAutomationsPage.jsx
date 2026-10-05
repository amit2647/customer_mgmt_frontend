import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  activateEmailAutomation,
  deactivateEmailAutomation,
  deleteEmailAutomation,
  getEmailAutomations,
} from "../../api/emailAutomations";

const EVENT_LABELS = {
  "lead.created": "Lead created",
  "lead.converted": "Lead converted to customer",
  "customer.created": "Customer created",
  // Raised once a profession bundle is installed.
  "engagement.created": "Engagement created",
  "obligation.due_soon": "Deadline due soon",
  "obligation.overdue": "Deadline overdue",
};

function EmailAutomationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canCreate = permissions.includes("email.automations.create");
  const canUpdate = permissions.includes("email.automations.update");
  const canDelete = permissions.includes("email.automations.delete");

  const [automations, setAutomations] = useState([]);
  const [accountCount, setAccountCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getEmailAutomations();

      setAutomations(data?.automations ?? []);
      setAccountCount((data?.accounts ?? []).length);
    } catch (requestError) {
      setError(requestError.message || "Failed to load automations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(automation) {
    try {
      setError("");

      if (automation.is_active) {
        await deactivateEmailAutomation(automation.id);
        setSuccess(`"${automation.name}" disabled. It will no longer send.`);
      } else {
        await activateEmailAutomation(automation.id);
        setSuccess(`"${automation.name}" enabled. It will now send real email.`);
      }

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to update the automation.");
    }
  }

  async function handleDelete(automation) {
    if (!window.confirm(`Delete automation "${automation.name}"?`)) {
      return;
    }

    try {
      setError("");

      await deleteEmailAutomation(automation.id);

      setSuccess("Automation deleted.");

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete the automation.");
    }
  }

  return (
    <main className="page settings-sub-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Email Automations</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Email Automations</h1>

          <p>
            Send a template automatically when something happens. Automations are
            off until you enable them — an enabled one sends real email.
          </p>
        </div>

        {canCreate && (
          <div className="page-header-actions">
            <button type="button" className="button button-primary" onClick={() => navigate("/settings/email-automations/new")}>
              + New Automation
            </button>
          </div>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading automations...</div>
        ) : automations.length === 0 ? (
          <div className="settings-empty">No automations yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Automation</th>
                <th>Trigger</th>
                <th>Template</th>
                <th>Sends from</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {automations.map((automation) => (
                <tr key={automation.id}>
                  <td>
                    <strong>{automation.name}</strong>

                    {automation.description && (
                      <span className="settings-row-hint">{automation.description}</span>
                    )}
                  </td>

                  <td>
                    <span className="settings-event">
                      {EVENT_LABELS[automation.trigger_event] || automation.trigger_event}
                    </span>
                  </td>

                  <td className="settings-cell-muted">{automation.template_name || "—"}</td>

                  {/* The default only resolves while exactly one account is
                      connected; flag the rows that would fail to send. */}
                  <td className="settings-cell-muted">
                    {automation.email_account_id
                      ? automation.email_account_address || "Inactive account"
                      : accountCount === 1
                        ? "Default account"
                        : <span className="settings-cell-warning">Choose an account</span>}
                  </td>

                  <td>
                    <span className={`settings-pill${automation.is_active ? " on" : ""}`}>
                      {automation.is_active ? "On" : "Off"}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      {canUpdate && (
                        <button className="link" onClick={() => handleToggle(automation)}>
                          {automation.is_active ? "Disable" : "Enable"}
                        </button>
                      )}

                      {canUpdate && (
                        <button className="link" onClick={() => navigate(`/settings/email-automations/${automation.id}/edit`)}>
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="link delete-link"
                          onClick={() => handleDelete(automation)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

    </main>
  );
}

export default EmailAutomationsPage;
