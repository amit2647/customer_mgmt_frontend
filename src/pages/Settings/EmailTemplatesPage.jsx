import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { deleteEmailTemplate, getEmailTemplates } from "../../api/emailTemplates";

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
    <main className="page settings-sub-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Email Templates</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Email Templates</h1>

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

      <section className="card">
        {loading ? (
          <div className="settings-empty">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="settings-empty">No templates yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <strong>{template.name}</strong>

                    {template.description && (
                      <span className="settings-row-hint">{template.description}</span>
                    )}
                  </td>

                  <td className="settings-cell-muted">{template.subject}</td>

                  <td>
                    <span className={`settings-pill${template.is_active ? " on" : ""}`}>
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">
                      {canUpdate && (
                        <button className="link" onClick={() => navigate(`/settings/email-templates/${template.id}/edit`)}>
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="link delete-link"
                          onClick={() => handleDelete(template)}
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

export default EmailTemplatesPage;
