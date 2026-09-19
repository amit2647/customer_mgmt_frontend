import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createEmailAutomation,
  getEmailAutomation,
  getEmailAutomations,
  updateEmailAutomation,
} from "../../api/emailAutomations";
import { getEmailTemplates } from "../../api/emailTemplates";
import ToggleField from "../../components/common/ToggleField";

const EMPTY = {
  name: "",
  description: "",
  trigger_event: "lead.created",
  template_id: "",
  is_active: false,
};

const EVENT_LABELS = {
  "lead.created": "Lead created",
  "lead.converted": "Lead converted to customer",
  "customer.created": "Customer created",
};

function EmailAutomationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState(Object.keys(EVENT_LABELS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // The event list comes from the API rather than a hardcoded copy, so a
      // new trigger added server-side appears here without a frontend change.
      const [templateData, listData] = await Promise.all([
        getEmailTemplates().catch(() => null),
        getEmailAutomations().catch(() => null),
      ]);

      setTemplates(templateData?.templates ?? []);

      if (Array.isArray(listData?.events) && listData.events.length > 0) {
        setEvents(listData.events);
      }

      if (isEditing) {
        const data = await getEmailAutomation(id);
        const automation = data?.automation || data;

        setForm({
          name: automation.name,
          description: automation.description || "",
          trigger_event: automation.trigger_event,
          template_id: automation.template_id,
          is_active: automation.is_active,
        });
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load the automation.");
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

      const payload = { ...form, template_id: Number(form.template_id) };

      if (isEditing) {
        await updateEmailAutomation(id, payload);
      } else {
        await createEmailAutomation(payload);
      }

      navigate("/settings/email-automations");
    } catch (requestError) {
      setError(requestError.message || "Failed to save the automation.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page settings-form-page">
        <div className="settings-empty">Loading automation...</div>
      </main>
    );
  }

  return (
    <main className="page settings-sub-page settings-form-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings/email-automations")}>
          ← Back to Email Automations
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>{isEditing ? "Edit Automation" : "New Automation"}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>{isEditing ? "Edit Automation" : "New Automation"}</h1>

          <p>
            Pick what happens and which template to send. An enabled automation
            sends real email the moment its trigger fires.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {templates.length === 0 && (
        <div className="alert alert-error">
          No templates available. Create a template first — an automation cannot
          be saved without one.
        </div>
      )}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Welcome email on new lead"
          disabled={saving}
            autoFocus
            required
          />
        </label>

        <label>
          When this happens
          <select
            value={form.trigger_event}
            onChange={(e) => update("trigger_event", e.target.value)}
          disabled={saving}
          >
            {events.map((event) => (
              <option key={event} value={event}>
                {EVENT_LABELS[event] || event}
              </option>
            ))}
          </select>
        </label>

        <label>
          Send this template
          <select
            value={form.template_id}
            onChange={(e) => update("template_id", e.target.value)}
          disabled={saving}
            required
          >
            <option value="">Select a template...</option>

            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field-full">
          Description
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional note about what this does"
          disabled={saving}
          />
        </label>

        <ToggleField
          label="Automation status"
          checked={form.is_active}
          onChange={(value) => update("is_active", value)}
          disabled={saving}
          onDescription="Sends real email automatically when this trigger fires."
          offDescription="Nothing will be sent. Turn this on when you are ready."
        />

        <div className="settings-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/settings/email-automations")}
          disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Automation"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EmailAutomationFormPage;
