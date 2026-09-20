import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  createAccessGrant,
  getAccessGrants,
  getOrganizationUsers,
  getPermissions,
  revokeAccessGrant,
} from "../../api/identity";

/*
 * Screens people actually ask for, mapped to the permission that unlocks them.
 * Granting is framed as "which screen" rather than "which permission code",
 * because that is how the request arrives.
 */
const SCREENS = [
  { permission: "leads.read", group: "leads", label: "Leads", description: "Lead list and detail" },
  {
    permission: "customers.read",
    group: "customers",
    label: "Customers",
    description: "Customer list and detail",
  },
  { permission: "services.read", group: "services", label: "Services", description: "Service catalog" },
  { permission: "reports.read", group: "reports", label: "Dashboard", description: "Metrics and pipeline" },
  {
    permission: "communications.read",
    group: "communications",
    label: "Communication",
    description: "Email threads on a record",
  },
  { permission: "email.templates.read", group: "email", label: "Email settings", description: "Templates and automations" },
  { permission: "users.read", group: "users", label: "Users & Roles", description: "People and their roles" },
];

const DURATIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
  { minutes: 1440, label: "24 hours" },
];

const EMPTY = {
  user_id: "",
  duration_minutes: 60,
  reason: "",
};

// Permission codes are "group.action", so the prefix groups them without a
// second list to maintain.
function groupPermissions(permissions) {
  const groups = new Map();

  for (const permission of permissions) {
    const [group] = permission.code.split(".");

    if (!groups.has(group)) {
      groups.set(group, []);
    }

    groups.get(group).push(permission);
  }

  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

function formatWhen(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function remaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();

  if (ms <= 0) {
    return "expired";
  }

  const minutes = Math.round(ms / 60000);

  return minutes < 60 ? `${minutes}m left` : `${Math.round(minutes / 60)}h left`;
}

function AccessGrantsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canManage = permissions.includes("system.settings");

  const [grants, setGrants] = useState([]);
  const [users, setUsers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [screens, setScreens] = useState(new Set());
  const [extraPermissions, setExtraPermissions] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [grantData, userData, permissionData] = await Promise.all([
        getAccessGrants(),
        user?.organizationId
          ? getOrganizationUsers(user.organizationId).catch(() => [])
          : [],
        getPermissions().catch(() => []),
      ]);

      setGrants(grantData?.grants ?? []);
      setUsers(Array.isArray(userData) ? userData : (userData?.users ?? []));
      setAllPermissions(
        Array.isArray(permissionData) ? permissionData : (permissionData?.permissions ?? []),
      );
    } catch (requestError) {
      setError(requestError.message || "Failed to load access grants.");
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleIn(setter) {
    return (value) =>
      setter((current) => {
        const next = new Set(current);
        next.has(value) ? next.delete(value) : next.add(value);
        return next;
      });
  }

  const togglePermission = toggleIn(setExtraPermissions);

  function toggleGroup(items) {
    const allOn = items.every((item) => extraPermissions.has(item.code));

    setExtraPermissions((current) => {
      const next = new Set(current);
      items.forEach((item) =>
        allOn ? next.delete(item.code) : next.add(item.code),
      );
      return next;
    });
  }

  /*
   * Deselecting a screen also drops any of its permissions that were ticked.
   * Otherwise they would stay selected while no longer visible, and get granted
   * without the person seeing them.
   */
  function toggleScreen(screen) {
    setScreens((current) => {
      const next = new Set(current);

      if (next.has(screen.permission)) {
        next.delete(screen.permission);

        setExtraPermissions((codes) => {
          const kept = new Set(codes);
          [...kept].forEach((code) => {
            if (code.split(".")[0] === screen.group) {
              kept.delete(code);
            }
          });
          return kept;
        });
      } else {
        next.add(screen.permission);
      }

      return next;
    });
  }

  // A screen is just a permission, so the two selections merge into one deduped
  // list; picking Leads and leads.read separately grants it once.
  const selectedCodes = [...new Set([...screens, ...extraPermissions])];

  const selectedGroups = new Set(
    SCREENS.filter((screen) => screens.has(screen.permission)).map((s) => s.group),
  );

  const visibleCount = allPermissions.filter((permission) =>
    selectedGroups.has(permission.code.split(".")[0]),
  ).length;

  const visibleGroups = groupPermissions(
    allPermissions.filter((permission) =>
      selectedGroups.has(permission.code.split(".")[0]),
    ),
  );

  function resetForm() {
    setForm(EMPTY);
    setScreens(new Set());
    setExtraPermissions(new Set());
  }

  async function handleGrant(event) {
    event.preventDefault();

    if (selectedCodes.length === 0) {
      setError("Select at least one screen or permission.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const result = await createAccessGrant({
        user_id: Number(form.user_id),
        duration_minutes: Number(form.duration_minutes),
        reason: form.reason,
        permission_codes: selectedCodes,
      });

      resetForm();
      setShowForm(false);
      setSuccess(
        `Granted ${result?.count ?? selectedCodes.length} permission(s). Takes effect immediately.`,
      );

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to grant access.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(grant) {
    if (!window.confirm(`Revoke ${grant.permission_code} from ${grant.user_name}?`)) {
      return;
    }

    try {
      setError("");

      await revokeAccessGrant(grant.id);

      setSuccess("Access revoked. It stopped working immediately.");

      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to revoke access.");
    }
  }

  const active = grants.filter((grant) => grant.is_active);
  const past = grants.filter((grant) => !grant.is_active);

  return (
    <main className="page settings-sub-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings")}>
          ← Back to Settings
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>Just-in-time Access</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>Just-in-time Access</h1>

          <p>
            Give someone one screen for a limited time. Grants are checked on
            every request, so they start and stop working immediately — no
            sign-out needed at either end.
          </p>
        </div>

        {canManage && !showForm && (
          <div className="page-header-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => setShowForm(true)}
            >
              + Grant Access
            </button>
          </div>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {showForm && (
        <form className="settings-form-card" onSubmit={handleGrant}>
          <label>
            Who
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              disabled={saving}
              required
            >
              <option value="">Select a user...</option>

              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.role_name || item.role_code}
                </option>
              ))}
            </select>
          </label>

          <div className="settings-field-full">
            <div className="permission-header">
              <strong>Which screens</strong>

              <span>{screens.size} selected</span>
            </div>

            <div className="permission-table-wrap">
              <table className="permission-table">
                <thead>
                  <tr>
                    <th className="permission-check-col" />
                    <th>Screen</th>
                    <th>Grants</th>
                  </tr>
                </thead>

                <tbody>
                  {SCREENS.map((screen) => (
                    <tr
                      key={screen.permission}
                      className={screens.has(screen.permission) ? "selected" : ""}
                    >
                      <td className="permission-check-col">
                        <input
                          id={`screen-${screen.group}`}
                          type="checkbox"
                          checked={screens.has(screen.permission)}
                          onChange={() => toggleScreen(screen)}
                          disabled={saving}
                        />
                      </td>

                      <td>
                        <label htmlFor={`screen-${screen.group}`}>
                          <strong>{screen.label}</strong>

                          <span>{screen.description}</span>
                        </label>
                      </td>

                      <td>
                        <code>{screen.permission}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="settings-field-full">
            <div className="permission-header">
              <strong>Additional permissions</strong>

              <span>
                {screens.size === 0
                  ? "select a screen first"
                  : `${extraPermissions.size} of ${visibleCount} selected`}
              </span>
            </div>

            <p className="permission-hint">
              A screen on its own grants view access. Add anything here that the
              person also needs to do — creating, editing or deleting.
            </p>

            {/* Scoped to the chosen screens: showing all 39 permissions here
                made the relevant handful hard to find. */}
            {screens.size === 0 ? (
              <div className="settings-empty grant-permission-empty">
                Choose one or more screens above to see the permissions they
                offer.
              </div>
            ) : (
              <div className="permission-table-wrap">
                <table className="permission-table">
                  <tbody>
                    {visibleGroups.map((group) => (
                      <Fragment key={group.name}>
                        <tr className="permission-group-row">
                          <td>
                            {group.name.replace(/_/g, " ")}
                            <span className="permission-group-count">
                              {group.items.length}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="link"
                              onClick={() => toggleGroup(group.items)}
                            >
                              {group.items.every((item) =>
                                extraPermissions.has(item.code),
                              )
                                ? "Clear"
                                : "Select all"}
                            </button>
                          </td>
                        </tr>

                        {group.items.map((permission) => (
                          <tr
                            key={permission.id}
                            className={
                              extraPermissions.has(permission.code) ? "selected" : ""
                            }
                          >
                            <td className="permission-check-col">
                              <input
                                id={`grant-${permission.id}`}
                                type="checkbox"
                                checked={extraPermissions.has(permission.code)}
                                onChange={() => togglePermission(permission.code)}
                                disabled={saving}
                              />
                            </td>

                            <td>
                              <label htmlFor={`grant-${permission.id}`}>
                                <strong>{permission.name}</strong>

                                <span>{permission.code}</span>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <label>
            For how long
            <select
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              disabled={saving}
            >
              {DURATIONS.map((duration) => (
                <option key={duration.minutes} value={duration.minutes}>
                  {duration.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field-full">
            Reason
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Investigating ticket 4821"
              disabled={saving}
              required
            />
          </label>

          <div className="settings-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="button button-primary" disabled={saving}>
              {saving
                ? "Granting..."
                : `Grant Access${selectedCodes.length ? ` (${selectedCodes.length})` : ""}`}
            </button>
          </div>
        </form>
      )}

      <section className="card">
        <div className="settings-section-head">
          <strong>Active</strong>
          <span>{active.length}</span>
        </div>

        {loading ? (
          <div className="settings-empty">Loading grants...</div>
        ) : active.length === 0 ? (
          <div className="settings-empty">No active grants.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Who</th>
                <th>Access</th>
                <th>Reason</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {active.map((grant) => (
                <tr key={grant.id}>
                  <td>
                    <strong>{grant.user_name || grant.subject_email}</strong>

                    <span className="settings-row-hint">{grant.user_email}</span>
                  </td>

                  <td>
                    <span className="settings-event">{grant.permission_code}</span>
                  </td>

                  <td className="settings-cell-muted">{grant.reason}</td>

                  <td>
                    <span className="settings-pill on">{remaining(grant.expires_at)}</span>

                    <span className="settings-row-hint">{formatWhen(grant.expires_at)}</span>
                  </td>

                  <td>
                    <div className="table-actions">
                      {canManage && (
                        <button
                          className="link delete-link"
                          onClick={() => handleRevoke(grant)}
                        >
                          Revoke
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

      {past.length > 0 && (
        <section className="card settings-history">
          <div className="settings-section-head">
            <strong>History</strong>
            <span>{past.length}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Who</th>
                <th>Access</th>
                <th>Reason</th>
                <th>Ended</th>
              </tr>
            </thead>

            <tbody>
              {past.map((grant) => (
                <tr key={grant.id}>
                  <td>{grant.user_name || grant.subject_email}</td>

                  <td>
                    <span className="settings-event">{grant.permission_code}</span>
                  </td>

                  <td className="settings-cell-muted">{grant.reason}</td>

                  <td className="settings-cell-muted">
                    {grant.revoked_at
                      ? `Revoked ${formatWhen(grant.revoked_at)}`
                      : `Expired ${formatWhen(grant.expires_at)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

export default AccessGrantsPage;
