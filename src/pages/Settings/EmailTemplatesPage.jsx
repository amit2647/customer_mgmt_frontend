import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { deleteEmailTemplate, getEmailTemplates } from "../../api/emailTemplates";
import DataGrid from "../../components/ui/DataGrid";
import Pill from "../../components/ui/Pill";

function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canCreate = permissions.includes("email.templates.create");
  const canUpdate = permissions.includes("email.templates.update");
  const canDelete = permissions.includes("email.templates.delete");

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getEmailTemplates();

      setTemplates(data?.templates ?? []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(template) {
    if (!window.confirm(`Delete template "${template.name}"?`)) {
      return;
    }

    try {
      setError("");

      await deleteEmailTemplate(template.id);

      setSuccess("Template deleted.");

      await load();
    } catch (requestError) {
      // 409 when an automation still references it — the schema uses
      // ON DELETE RESTRICT so this fails loudly instead of silently breaking it.
      setError(requestError.message || "Failed to delete the template.");
    }
  }

  return (
    <div className="settings-panel settings-sub-page">

      <div className="page-header settings-panel-header">
        <div>
          <h2>Email Templates</h2>

          <p>
            Reusable copy for automations and manual sends. Use placeholders like{" "}
            <code>{"{{lead.name}}"}</code> — anything unknown is left visible
            rather than sent blank.
          </p>
        </div>

        {canCreate && (
          <div className="page-header-actions">
            <button type="button" className="button button-primary" onClick={() => navigate("/settings/email-templates/new")}>
              + New Template
            </button>
          </div>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <section className="card">
          <div className="settings-empty">Loading templates...</div>
        </section>
      ) : (
        <DataGrid
          id="email-templates"
          label="Email templates"
          rows={templates}
          search={{ placeholder: "Search templates", label: "Search templates", text: (template) => [template.name, template.subject, template.description].join(" ") }}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (template) => (
                <>
                  <span className="grid-cell-title">{template.name}</span>
                  {template.description && <span className="grid-cell-sub">{template.description}</span>}
                </>
              ),
            },
            { key: "subject", header: "Subject", render: (template) => <span className="settings-cell-muted">{template.subject}</span> },
            {
              key: "status",
              header: "Status",
              value: (template) => (template.is_active ? "Active" : "Inactive"),
              filter: { tone: (value) => (value === "Active" ? "success" : "neutral") },
              render: (template) => <Pill dot tone={template.is_active ? "success" : "neutral"}>{template.is_active ? "Active" : "Inactive"}</Pill>,
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              hideable: false,
              render: (template) => (
                <div className="table-actions">
                  {canUpdate && (
                    <button type="button" className="link" onClick={() => navigate(`/settings/email-templates/${template.id}/edit`)}>Edit</button>
                  )}
                  {canDelete && (
                    <button type="button" className="link delete-link" onClick={() => handleDelete(template)}>Delete</button>
                  )}
                </div>
              ),
            },
          ]}
          empty="No templates yet."
        />
      )}

    </div>
  );
}

export default EmailTemplatesPage;
