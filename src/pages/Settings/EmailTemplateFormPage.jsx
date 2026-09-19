import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
} from "../../api/emailTemplates";
import ToggleField from "../../components/common/ToggleField";

const EMPTY = { name: "", subject: "", body: "", description: "", is_active: true };

function EmailTemplateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isEditing) {
      return;
    }

    try {
      setLoading(true);

      const data = await getEmailTemplate(id);
      const template = data?.template || data;

      setForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        description: template.description || "",
        is_active: template.is_active,
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to load the template.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    load();
  }, [load]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (isEditing) {
        await updateEmailTemplate(id, form);
      } else {
        await createEmailTemplate(form);
      }

      navigate("/settings/email-templates");
    } catch (requestError) {
      setError(requestError.message || "Failed to save the template.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page settings-form-page">
        <div className="settings-empty">Loading template...</div>
      </main>
    );
  }

  return (
    <main className="page settings-sub-page settings-form-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings/email-templates")}>
          ← Back to Email Templates
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>{isEditing ? "Edit Template" : "New Template"}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>{isEditing ? "Edit Template" : "New Template"}</h1>

          <p>
            Use placeholders like <code>{"{{lead.name}}"}</code>,{" "}
            <code>{"{{customer.company}}"}</code> or{" "}
            <code>{"{{organization.name}}"}</code>. Anything unrecognised is left
            visible rather than sent as a blank.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Welcome new lead"
          disabled={saving}
            autoFocus
            required
          />
        </label>

        <label>
          Subject
          <input
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Thanks for getting in touch, {{lead.name}}"
          disabled={saving}
            required
          />
        </label>

        <label className="settings-field-full">
          Body
          <textarea
            className="settings-form-body"
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            rows={16}
          disabled={saving}
            required
          />
        </label>

        <label className="settings-field-full">
          Description
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional note about when to use this"
          disabled={saving}
          />
        </label>

        <ToggleField
          label="Template status"
          checked={form.is_active}
          onChange={(value) => update("is_active", value)}
          disabled={saving}
          onDescription="Available to automations and manual sends."
          offDescription="Automations will skip this template until it is active."
        />

        <div className="settings-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/settings/email-templates")}
          disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EmailTemplateFormPage;
