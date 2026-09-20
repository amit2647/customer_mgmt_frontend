import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createRole,
  getPermissions,
  getRole,
  updateRole,
  updateRolePermissions,
} from "../../api/identity";

// permissions are coded "group.action", so the prefix gives a natural grouping
// without maintaining a separate list here.
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

function RoleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);

  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [selected, setSelected] = useState(new Set());
  const [permissions, setPermissions] = useState([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const permissionData = await getPermissions();

      setPermissions(
        Array.isArray(permissionData) ? permissionData : (permissionData?.permissions ?? []),
      );

      if (isEditing) {
        const role = await getRole(id);

        setForm({
          name: role.name || "",
          code: role.code || "",
          description: role.description || "",
        });

        setSelected(new Set((role.permissions || []).map((p) => p.code)));

        // Built-in roles are shared by every organization, so the API rejects
        // edits. Show them read-only rather than letting the save fail.
        setReadOnly(Boolean(role.is_system_role) || role.organization_id === null);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load the role.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(code) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleGroup(items, allOn) {
    setSelected((current) => {
      const next = new Set(current);
      items.forEach((item) => (allOn ? next.delete(item.code) : next.add(item.code)));
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (isEditing) {
        await updateRole(id, { name: form.name, description: form.description });
        await updateRolePermissions(id, [...selected]);
      } else {
        await createRole({ ...form, permissionCodes: [...selected] });
      }

      navigate("/settings/users?tab=roles");
    } catch (requestError) {
      setError(requestError.message || "Failed to save the role.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page settings-sub-page">
        <div className="settings-empty">Loading role...</div>
      </main>
    );
  }

  const groups = groupPermissions(permissions);

  return (
    <main className="page settings-sub-page settings-form-page">
      <div className="workflow-breadcrumb">
        <button type="button" onClick={() => navigate("/settings/users?tab=roles")}>
          ← Back to Users &amp; Roles
        </button>

        <div className="workflow-context">
          <span>SETTINGS</span>
          <strong>{isEditing ? form.name || "Role" : "New Role"}</strong>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h1>{isEditing ? form.name || "Role" : "New Role"}</h1>

          <p>
            {readOnly
              ? "This is a built-in role shared by every organization, so it cannot be changed. Create a custom role to define your own permissions."
              : "Choose what this role can do. Users assigned to it get exactly these permissions the next time they sign in."}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form className="settings-form-card" onSubmit={handleSubmit}>
        <label>
          Role name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Regional Lead"
            disabled={saving || readOnly}
            autoFocus
            required
          />
        </label>

        <label>
          Code
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="REGIONAL_LEAD"
            disabled={saving || readOnly || isEditing}
            required
          />
        </label>

        <label className="settings-field-full">
          Description
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional note about who this role is for"
            disabled={saving || readOnly}
          />
        </label>

        <div className="settings-field-full">
          <div className="permission-header">
            <strong>Permissions</strong>

            <span>
              {selected.size} of {permissions.length} selected
            </span>
          </div>

          <div className="permission-table-wrap">
            <table className="permission-table">
              <thead>
                <tr>
                  <th className="permission-check-col" />
                  <th>Permission</th>
                  <th>Code</th>
                </tr>
              </thead>

              {groups.map((group) => {
                const allOn = group.items.every((item) => selected.has(item.code));

                return (
                  <tbody key={group.name}>
                    {/* Group header doubles as the select-all control. */}
                    <tr className="permission-group-row">
                      <td colSpan={2}>{group.name.replace(/_/g, " ")}</td>

                      <td>
                        {!readOnly && (
                          <button
                            type="button"
                            className="link"
                            onClick={() => toggleGroup(group.items, allOn)}
                          >
                            {allOn ? "Clear" : "Select all"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {group.items.map((permission) => (
                      <tr
                        key={permission.id}
                        className={selected.has(permission.code) ? "selected" : ""}
                      >
                        <td className="permission-check-col">
                          <input
                            id={`perm-${permission.id}`}
                            type="checkbox"
                            checked={selected.has(permission.code)}
                            onChange={() => toggle(permission.code)}
                            disabled={saving || readOnly}
                          />
                        </td>

                        <td>
                          <label htmlFor={`perm-${permission.id}`}>
                            <strong>{permission.name}</strong>

                            {permission.description && (
                              <span>{permission.description}</span>
                            )}
                          </label>
                        </td>

                        <td>
                          <code>{permission.code}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>

        <div className="settings-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/settings/users?tab=roles")}
            disabled={saving}
          >
            {readOnly ? "Back" : "Cancel"}
          </button>

          {!readOnly && (
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Role"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

export default RoleFormPage;
