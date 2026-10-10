import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  activateEmailAutomation,
  deactivateEmailAutomation,
  deleteEmailAutomation,
  getEmailAutomations,
} from "../../api/emailAutomations";
import DataGrid from "../../components/ui/DataGrid";
import Pill, { toneFor } from "../../components/ui/Pill";

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
    <div className="settings-panel settings-sub-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Email Automations</h2>

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

      <DataGrid
        id="email-automations"
        label="Email automations"
        rows={automations}
        loading={loading}
        search={{ placeholder: "Search automations", label: "Search automations", text: (automation) => [automation.name, automation.description, automation.template_name].join(" ") }}
        columns={[
          {
            key: "name",
            header: "Automation",
            render: (automation) => (
              <>
                <span className="grid-cell-title">{automation.name}</span>
                {automation.description && <span className="grid-cell-sub">{automation.description}</span>}
              </>
            ),
          },
          {
            key: "trigger",
            header: "Trigger",
            value: (automation) => EVENT_LABELS[automation.trigger_event] || automation.trigger_event,
            filter: { tone: toneFor },
            render: (automation) => {
              const label = EVENT_LABELS[automation.trigger_event] || automation.trigger_event;
              return <Pill tone={toneFor(label)}>{label}</Pill>;
            },
          },
          { key: "template_name", header: "Template", render: (automation) => <span className="settings-cell-muted">{automation.template_name || "—"}</span> },
          {
            key: "account",
            header: "Sends from",
            sortable: false,
            // The default only resolves while exactly one account is
            // connected; flag the rows that would fail to send.
            render: (automation) => (
              <span className="settings-cell-muted">
                {automation.email_account_id
                  ? automation.email_account_address || "Inactive account"
                  : accountCount === 1
                    ? "Default account"
                    : <span className="settings-cell-warning">Choose an account</span>}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            value: (automation) => (automation.is_active ? "On" : "Off"),
            filter: { tone: (value) => (value === "On" ? "success" : "neutral") },
            render: (automation) => <Pill dot tone={automation.is_active ? "success" : "neutral"}>{automation.is_active ? "On" : "Off"}</Pill>,
          },
          {
            key: "actions",
            header: "",
            sortable: false,
            hideable: false,
            render: (automation) => (
              <div className="table-actions">
                {canUpdate && (
                  <button type="button" className="link" onClick={() => handleToggle(automation)}>{automation.is_active ? "Disable" : "Enable"}</button>
                )}
                {canUpdate && (
                  <button type="button" className="link" onClick={() => navigate(`/settings/email-automations/${automation.id}/edit`)}>Edit</button>
                )}
                {canDelete && (
                  <button type="button" className="link delete-link" onClick={() => handleDelete(automation)}>Delete</button>
                )}
              </div>
            ),
          },
        ]}
        empty="No automations yet."
      />

    </div>
  );
}

export default EmailAutomationsPage;
