import { useCallback, useEffect, useState } from "react";
import { Buildings, Hash, LinkSimple, PencilSimple, Power, ShieldCheck } from "@phosphor-icons/react";

import { useAuth } from "../../context/AuthContext";
import { getOrganization, getSecurityPolicy, setSecurityPolicy, updateOrganization } from "../../api/identity";
import { SettingRow, SettingRows } from "../../components/ui/SettingRow";
import { SettingRowsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/feedback";

const FIELDS = {
  name: { title: "Organization name", description: "Shown across the workspace and on what it sends", icon: <Buildings size={16} /> },
  slug: { title: "Slug", description: "A short identifier for this organization", icon: <LinkSimple size={16} /> },
};

function OrganizationPage() {
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canUpdate = permissions.includes("organization.update");
  // Requiring two-factor sign-in is security policy: system.settings (P5).
  const canSetSecurity = permissions.includes("system.settings");

  // Always the caller's own organization, from the token. The list endpoint
  // returns every organization on the platform, which is not what this screen is.
  const organizationId = user?.organizationId;

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // A result ({ type, text }) shows as a toast.
  const report = (result) => toast[result.type === "error" ? "error" : "success"](result.text);
  const [requireMfa, setRequireMfa] = useState(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getOrganization(organizationId);
      setOrganization(data?.organization || data);
    } catch (requestError) {
      toast.error(requestError.message || "Failed to load the organization.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canSetSecurity) return;
    getSecurityPolicy()
      .then((policy) => setRequireMfa(Boolean(policy.requireMfa)))
      .catch(() => setRequireMfa(null));
  }, [canSetSecurity]);

  async function saveRequireMfa(next) {
    try {
      setSaving(true);
      const policy = await setSecurityPolicy(next);
      setRequireMfa(Boolean(policy.requireMfa));
      report({
        row: "mfa",
        type: "success",
        text: policy.requireMfa
          ? "Two-factor sign-in is now required. Anyone without it sets it up at their next sign-in."
          : "Two-factor sign-in is now optional.",
      });
    } catch (requestError) {
      report({ row: "mfa", type: "error", text: requestError.message || "Could not change the policy." });
    } finally {
      setSaving(false);
    }
  }

  // The endpoint takes the whole record, so every save sends all three.
  async function save(field, next) {
    try {
      setSaving(true);

      await updateOrganization(organizationId, {
        name: organization.name || "",
        slug: organization.slug || "",
        status: organization.status || "Active",
        [field]: next,
      });

      setEditing(null);
      report({ row: field, type: "success", text: "Organization updated." });
      await load();
    } catch (requestError) {
      report({ row: field, type: "error", text: requestError.message || "Failed to update the organization." });
    } finally {
      setSaving(false);
    }
  }


  function textRow(field) {
    const { title, description, icon } = FIELDS[field];

    return (
      <SettingRow
        icon={icon}
        title={title}
        description={description}
        action={
          editing !== field && (
            <>
              <span className="setting-value">{organization[field] || "—"}</span>
              {canUpdate && (
                <button type="button" className="setting-edit" aria-label={`Edit ${title.toLowerCase()}`} onClick={() => { setValue(organization[field] || ""); setEditing(field); }}>
                  <PencilSimple size={16} />
                </button>
              )}
            </>
          )
        }
      >
        {editing === field && (
          <form className="setting-form" onSubmit={(event) => { event.preventDefault(); save(field, value.trim()); }}>
            <label>
              {title}
              <input value={value} onChange={(event) => setValue(event.target.value)} disabled={saving} required autoFocus />
            </label>
            
            <div className="setting-form-actions">
              <button type="button" className="secondary-button" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        )}
      </SettingRow>
    );
  }

  return (
    <div className="settings-panel settings-sub-page">
      <div className="page-header settings-panel-header">
        <div>
          <h2>Organization</h2>
          <p>Details for the organization every lead, customer and user in this workspace belongs to.</p>
        </div>
      </div>


      {loading && <SettingRowsSkeleton label="Organization" rows={5} />}

      {!loading && organization && (
        <SettingRows label="Organization">
          {textRow("name")}
          {textRow("slug")}

          <SettingRow
            icon={<Power size={16} />}
            title="Status"
            description="An inactive organization is kept but marked as not in use"
            action={
              <select
                className="setting-select"
                aria-label="Status"
                value={organization.status || "Active"}
                onChange={(event) => save("status", event.target.value)}
                disabled={saving || !canUpdate}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            }
          >
          </SettingRow>

          {canSetSecurity && requireMfa !== null && (
            <SettingRow
              icon={<ShieldCheck size={16} />}
              title="Two-factor sign-in"
              description="Require a code from an authenticator app at every sign-in, for everyone in this organization"
              action={
                <select
                  className="setting-select"
                  aria-label="Two-factor sign-in"
                  value={requireMfa ? "required" : "optional"}
                  onChange={(event) => saveRequireMfa(event.target.value === "required")}
                  disabled={saving}
                >
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              }
            >
            </SettingRow>
          )}

          <SettingRow
            icon={<Hash size={16} />}
            title="Organization ID"
            description="Quote it when you contact support"
            action={<span className="setting-value">{organization.id ?? organizationId}</span>}
          />
        </SettingRows>
      )}
    </div>
  );
}

export default OrganizationPage;
