import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getOrganization, updateOrganization } from "../../api/identity";

function OrganizationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canUpdate = permissions.includes("organization.update");

  // Always the caller's own organization, from the token. The list endpoint
  // returns every organization on the platform, which is not what this screen is.
  const organizationId = user?.organizationId;

  const [form, setForm] = useState({ name: "", slug: "", status: "Active" });
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getOrganization(organizationId);
      const organization = data?.organization || data;

      setForm({
        name: organization.name || "",
        slug: organization.slug || "",
        status: organization.status || "Active",
      });

      setMeta(organization);
    } catch (requestError) {
      setError(requestError.message || "Failed to load the organization.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

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

      await updateOrganization(organizationId, form);

      setSuccess("Organization updated.");

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to update the organization.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page">
        <div className="settings-empty">Loading organization...</div>
      </main>
    );
  }

  return (
    <main className="page settings-sub-page settings-form-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Organization</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Organization</h1>

          <p>
            Details for the organization every lead, customer and user in this
            workspace belongs to.
          </p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Organization name
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={saving || !canUpdate}
            required
          />
        </label>

        <label>
          Slug
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            disabled={saving || !canUpdate}
            required
          />
        </label>

        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            disabled={saving || !canUpdate}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <div className="settings-readonly">
          <span>Organization ID</span>
          <strong>{meta?.id ?? organizationId}</strong>
        </div>

        {canUpdate && (
          <div className="settings-form-actions">
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}

export default OrganizationPage;
